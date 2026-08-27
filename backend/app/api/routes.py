from typing import List, Optional
from fastapi import BackgroundTasks, UploadFile, APIRouter, File, HTTPException, Query
from app.services.file_parser import parse_file
from app.services.preprocess import preprocess_document
from app.services.preprocess import clean_title, classify_paper_domain
from app.services.neo4j import (
    save_document,
    save_entities,
    save_concepts,
    get_all_paper_graph,
    get_semantic_relationships,
    delete_document,
)
from app.services.relationship import analyze_new_paper, search_documents
from app.services.gemini import simplify_abstract
from app.services.summary_store import (
    get_saved_summary,
    save_summary,
    delete_saved_summary,
    load_all_summaries,
)
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, SessionExpired, AuthError
from app.services.config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

router = APIRouter()
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def _run_semantic_analysis(document: dict) -> None:
    try:
        analyze_new_paper(document, driver)
    except Exception:
        # A Gemini or background-task failure must not affect stored papers.
        pass


@router.post("/upload")
async def upload_documents(background_tasks: BackgroundTasks, files: List[UploadFile] = File(...)):
    """
    Accepts up to 3 documents and stores a searchable research profile.
    """
    if len(files) > 3:
        raise HTTPException(status_code=400, detail="You can upload up to 3 files only.")

    results = []
    for file in files:
        # 1. Parse file content
        text = await parse_file(file)

        # Keep the existing raw document and graph extraction path intact.
        result = preprocess_document(text, file.filename)
        doc_id = save_document(file.filename, text, driver, result["profile"])

        # 4. Save entities linked to this document
        save_entities(doc_id, result["entities"],driver)

        # 5. Save topic concepts so related papers can be connected later
        save_concepts(doc_id, result["concepts"], driver)

        if result["profile"].get("simplified_abstract"):
            save_summary(
                doc_id,
                result["profile"]["simplified_abstract"],
                title=result["profile"].get("title", file.filename),
                filename=file.filename,
            )

        document = {"id": doc_id, **result["profile"]}
        background_tasks.add_task(_run_semantic_analysis, document)

        results.append({
            "id": doc_id,
            "filename": file.filename,
            "preview": text[:500],
            "entities_preview": result["entities"][:10],
            "metadata": result["profile"],
        })

    return {"documents": results}


@router.get("/search")
async def search_library(q: str, limit: int = 20):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty")
    try:
        return {"query": q, "results": search_documents(q, driver, min(max(limit, 1), 50))}
    except (ServiceUnavailable, SessionExpired, AuthError):
        raise HTTPException(status_code=503, detail="Paper search is temporarily unavailable")



@router.get("/graph/{doc_id}")
async def get_graph(doc_id: str):
    """
    Return a paper-only semantic graph for Cytoscape and Neo4j Bloom.
    Entity and concept nodes remain stored, but are intentionally excluded
    from this relationship view.
    """
    try:
        with driver.session() as session:
            root_document_result = session.run(
                """
                MATCH (d:Document {id: $doc_id})
                RETURN d
                """,
                doc_id=doc_id,
            ).single()

            if not root_document_result:
                raise HTTPException(status_code=404, detail="Graph not found")

            root_document = root_document_result["d"]

            nodes = {}
            edges = []

            papers, semantic_results = get_all_paper_graph(driver)

            def add_node(node_id: int, label: str, description: str, kind: str, domain: str = "Computer Science & AI", domain_color: str = "#f87171"):
                if node_id not in nodes:
                    nodes[node_id] = {
                        "id": node_id,
                        "label": label,
                        "description": description,
                        "kind": kind,
                        "domain": domain,
                        "domain_color": domain_color,
                    }

            def add_edge(source: int, target: int, label: str, score: float = 0.0):
                edges.append({
                    "source": source,
                    "target": target,
                    "label": label,
                    "score": score,
                })

            for paper in papers:
                cleaned_t = clean_title(paper.get("title", ""), paper.get("filename", ""))
                domain_info = classify_paper_domain(cleaned_t, paper.get("abstract", ""))
                paper["title"] = cleaned_t
                paper["domain"] = domain_info["domain"]
                paper["domain_color"] = domain_info["domain_color"]
                add_node(
                    paper["id"],
                    cleaned_t,
                    paper.get("abstract", "")[:500],
                    "paper",
                    domain=domain_info["domain"],
                    domain_color=domain_info["domain_color"],
                )

            for item in semantic_results:
                other = next((paper for paper in papers if paper["id"] == item["target_id"]), None)
                relationship = item["relationship"]
                if not other:
                    continue
                raw_score = float(relationship.get("score") or relationship.get("confidence") or 0.75)
                pct = round(raw_score * 100) if raw_score <= 1.0 else round(raw_score)
                edge_label = f"{pct}% Match"
                item["relationship"]["formatted_score"] = f"{pct}%"
                add_edge(item["source_id"], item["target_id"], edge_label, raw_score)

            if not nodes:
                raise HTTPException(status_code=404, detail="Graph not found")

            paper = dict(root_document)
            paper.pop("embedding", None)
            paper["title"] = clean_title(paper.get("title", ""), paper.get("filename", ""))
            root_dom = classify_paper_domain(paper["title"], paper.get("abstract", ""))
            paper["domain"] = root_dom["domain"]
            paper["domain_color"] = root_dom["domain_color"]

            selected_relationships = [item for item in semantic_results if doc_id in {item["source_id"], item["target_id"]}]
            return {"id": doc_id, "paper": paper, "papers": papers, "nodes": list(nodes.values()), "edges": edges, "relationships": semantic_results, "selected_relationships": selected_relationships}
    except (ServiceUnavailable, SessionExpired, AuthError):
        raise HTTPException(status_code=503, detail="Neo4j is unavailable. Start the database and try again.")


@router.get("/paper/{doc_id}/summary")
async def get_paper_summary(doc_id: str, refresh: bool = Query(False)):
    """
    Get the AI simplified summary for a paper.
    If already cached in summaries.json, returns it directly without querying Gemini.
    If refresh is True, regenerates the summary via Gemini and updates both JSON cache and Neo4j.
    """
    try:
        with driver.session() as session:
            record = session.run(
                """
                MATCH (paper:Document {id:$doc_id})
                RETURN paper.id AS id, paper.title AS title, paper.filename AS filename,
                       paper.authors AS authors, paper.year AS year, paper.abstract AS abstract,
                       paper.simplified_abstract AS simplified_abstract
                """,
                doc_id=doc_id,
            ).single()
    except (ServiceUnavailable, SessionExpired, AuthError):
        raise HTTPException(status_code=503, detail="Neo4j is unavailable. Start the database and try again.")
    if not record:
        raise HTTPException(status_code=404, detail="Paper not found")

    paper = dict(record)
    paper["title"] = clean_title(paper.get("title", ""), paper.get("filename", ""))
    abstract = paper.get("abstract") or ""
    dom_info = classify_paper_domain(paper["title"], abstract)
    paper["domain"] = dom_info["domain"]
    paper["domain_color"] = dom_info["domain_color"]

    if not refresh:
        # 1. Check persistent JSON file cache first
        saved = get_saved_summary(doc_id)
        if saved:
            paper["simplified_abstract"] = saved
            return paper

        # 2. Check if Neo4j already had a summary
        if paper.get("simplified_abstract"):
            save_summary(doc_id, paper["simplified_abstract"], title=paper.get("title", ""), filename=paper.get("filename", ""))
            return paper

        # 3. If missing, generate with Gemini
        if abstract:
            summary = simplify_abstract(abstract)
            if summary:
                paper["simplified_abstract"] = summary
                save_summary(doc_id, summary, title=paper.get("title", ""), filename=paper.get("filename", ""))
                try:
                    with driver.session() as session:
                        session.run("MATCH (paper:Document {id:$doc_id}) SET paper.simplified_abstract=$summary", doc_id=doc_id, summary=summary)
                except Exception:
                    pass
    else:
        # Force refresh with Gemini
        if abstract:
            summary = simplify_abstract(abstract)
            if summary:
                paper["simplified_abstract"] = summary
                save_summary(doc_id, summary, title=paper.get("title", ""), filename=paper.get("filename", ""))
                try:
                    with driver.session() as session:
                        session.run("MATCH (paper:Document {id:$doc_id}) SET paper.simplified_abstract=$summary", doc_id=doc_id, summary=summary)
                except Exception:
                    pass

    paper["simplified_abstract"] = paper.get("simplified_abstract") or "AI summary is not available yet. It will appear after Gemini processing completes."
    return paper


@router.post("/paper/{doc_id}/summary/refresh")
async def refresh_paper_summary(doc_id: str):
    """
    Explicit POST endpoint to refresh and regenerate the AI summary with Gemini.
    """
    return await get_paper_summary(doc_id=doc_id, refresh=True)


@router.delete("/paper/{doc_id}")
@router.delete("/document/{doc_id}")
async def remove_paper(doc_id: str):
    """
    Deletes a paper from Neo4j (along with its relationships) and removes its cached summary from JSON.
    """
    try:
        deleted = delete_document(doc_id, driver)
        delete_saved_summary(doc_id)
        if not deleted:
            # Check if it existed
            pass
        return {
            "success": True,
            "message": "Paper removed successfully",
            "id": doc_id,
        }
    except (ServiceUnavailable, SessionExpired, AuthError):
        raise HTTPException(status_code=503, detail="Neo4j is unavailable. Start the database and try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to remove paper: {str(e)}")


@router.get("/documents")
async def list_documents():
    """
    Return all documents stored in Neo4j with their id + title/filename.
    Used to populate sidebar in the UI.
    """
    try:
        with driver.session() as session:
            query = """
            MATCH (d:Document)
            RETURN d.id AS id, d.title AS title, d.filename AS filename
            ORDER BY coalesce(d.title, d.filename)
            """
            results = session.run(query)

            documents = []
            for record in results:
                documents.append({
                    "id": record["id"],
                    "title": clean_title(record.get("title") or "", record.get("filename") or "")
                })
    except (ServiceUnavailable, SessionExpired, AuthError):
        raise HTTPException(status_code=503, detail="Neo4j is unavailable. Start the database and try again.")

    return documents