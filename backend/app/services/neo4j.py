from neo4j import Driver
import uuid
import hashlib
from typing import Any

def save_document(filename: str, content: str, driver: Driver, profile: dict[str, Any] | None = None, embedding: list[float] | None = None) -> str:
    doc_id = str(uuid.uuid4())
    content_hash = hashlib.sha256(content.encode("utf-8", errors="ignore")).hexdigest()
    with driver.session() as session:
        record = session.run(
            """
            MERGE (d:Document {content_hash:$content_hash})
            ON CREATE SET d.id=$id, d.filename=$filename, d.content=$content,
                d.title=$title, d.authors=$authors, d.year=$year, d.abstract=$abstract, d.simplified_abstract=$simplified_abstract, d.introduction=$introduction,
                d.methodology=$methodology, d.conclusion=$conclusion, d.embedding=$embedding
            RETURN d.id AS id
            """,
            id=doc_id, content_hash=content_hash, filename=filename, content=content,
            title=(profile or {}).get("title", filename),
            authors=(profile or {}).get("authors", ""), year=(profile or {}).get("year"),
            simplified_abstract=(profile or {}).get("simplified_abstract", ""),
                abstract=(profile or {}).get("abstract", ""),
            introduction=(profile or {}).get("introduction", ""),
            methodology=(profile or {}).get("methodology", ""),
            conclusion=(profile or {}).get("conclusion", ""),
            embedding=embedding,
        ).single()
    return record["id"] if record else doc_id

def save_entities(doc_id: str, entities: list,driver: Driver):
    with driver.session() as session:
        for ent in entities:
            session.run(
                """
                MATCH (d:Document {id:$doc_id})
                MERGE (e:Entity {text:$text, label:$label})
                MERGE (d)-[:HAS_ENTITY]->(e)
                """,
                doc_id=doc_id, text=ent["text"], label=ent["label"]
            )


def save_concepts(doc_id: str, concepts: list, driver: Driver):
    with driver.session() as session:
        for concept in concepts:
            session.run(
                """
                MATCH (d:Document {id:$doc_id})
                MERGE (c:Concept {key:$key})
                ON CREATE SET c.text = $text
                SET c.text = coalesce(c.text, $text)
                MERGE (d)-[:HAS_CONCEPT]->(c)
                """,
                doc_id=doc_id, key=concept["key"], text=concept["text"]
            )


def get_documents_with_embeddings(driver: Driver) -> list[dict[str, Any]]:
    with driver.session() as session:
        result = session.run("MATCH (d:Document) RETURN d ORDER BY d.filename")
        return [dict(record["d"]) for record in result]


def set_embedding(doc_id: str, embedding: list[float], driver: Driver) -> None:
    with driver.session() as session:
        session.run("MATCH (d:Document {id:$doc_id}) SET d.embedding=$embedding", doc_id=doc_id, embedding=embedding)

def set_simplified_abstract(doc_id: str, summary: str, driver: Driver) -> None:
    with driver.session() as session:
        session.run("MATCH (d:Document {id:$doc_id}) SET d.simplified_abstract=$summary", doc_id=doc_id, summary=summary)


def get_document(driver: Driver, doc_id: str) -> dict[str, Any] | None:
    with driver.session() as session:
        record = session.run("MATCH (d:Document {id:$doc_id}) RETURN d", doc_id=doc_id).single()
        return dict(record["d"]) if record else None


def save_semantic_relationship(source_id: str, target_id: str, analysis: dict[str, Any], driver: Driver) -> None:
    relationship_type = analysis["relationship_type"]
    with driver.session() as session:
        session.run(
            """
            MATCH (source:Document {id:$source_id}), (target:Document {id:$target_id})
            MERGE (source)-[r:SEMANTICALLY_SIMILAR]->(target)
            SET r.score=$score, r.confidence=$confidence, r.relationship_type=$relationship_type,
                r.similarity_reason=$similarity_reason, r.shared_topics=$shared_topics,
                r.shared_methods=$shared_methods, r.shared_concepts=$shared_concepts,
                r.shared_datasets=$shared_datasets, r.differences=$differences,
                r.explanation=$explanation, r.evidence=$evidence
            """,
            source_id=source_id, target_id=target_id,
            score=float(analysis.get("score", analysis.get("confidence", 0))),
            confidence=analysis["confidence"], relationship_type=relationship_type,
            similarity_reason=analysis.get("similarity_reason", ""),
            shared_topics=analysis.get("shared_topics", []), shared_methods=analysis.get("shared_methods", []),
            shared_concepts=analysis.get("shared_concepts", []), shared_datasets=analysis.get("shared_datasets", []),
            differences=analysis.get("differences", []), explanation=analysis.get("explanation", ""),
            evidence=analysis.get("evidence", []),
        )


def get_semantic_relationships(doc_id: str, driver: Driver) -> list[dict[str, Any]]:
    with driver.session() as session:
        result = session.run(
            """
            MATCH (d:Document {id:$doc_id})-[r:SEMANTICALLY_SIMILAR]-(other:Document)
                RETURN {id: other.id, title: other.title, filename: other.filename,
                    authors: other.authors, year: other.year, abstract: other.abstract,
                    simplified_abstract: other.simplified_abstract} AS other,
                r {.*, score: r.score, confidence: r.confidence,
                   relationship_type: r.relationship_type,
                   similarity_reason: r.similarity_reason,
                   shared_topics: r.shared_topics, shared_methods: r.shared_methods,
                   shared_concepts: r.shared_concepts, shared_datasets: r.shared_datasets,
                   differences: r.differences, explanation: r.explanation,
                   evidence: r.evidence} AS relationship
            ORDER BY r.score DESC
            """, doc_id=doc_id,
        )
        return [{"paper": dict(record["other"]), "relationship": dict(record["relationship"])} for record in result]


def get_all_paper_graph(driver: Driver) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    with driver.session() as session:
        paper_result = session.run(
            """
            MATCH (paper:Document)
            RETURN {id: paper.id, title: coalesce(paper.title, paper.filename),
                    filename: paper.filename, authors: paper.authors, year: paper.year,
                        abstract: paper.abstract, simplified_abstract: paper.simplified_abstract} AS paper
            ORDER BY paper.title, paper.filename
            """
        )
        relationship_result = session.run(
            """
            MATCH (source:Document)-[r:SEMANTICALLY_SIMILAR]->(target:Document)
            WHERE coalesce(r.score, 0) >= 0.5 AND coalesce(r.confidence, 0) >= 0.55
            RETURN source.id AS source_id, target.id AS target_id,
                r {.*, score: r.score, confidence: r.confidence,
                   relationship_type: r.relationship_type,
                   similarity_reason: r.similarity_reason,
                   shared_topics: r.shared_topics, shared_methods: r.shared_methods,
                   shared_concepts: r.shared_concepts, shared_datasets: r.shared_datasets,
                   differences: r.differences, explanation: r.explanation,
                   evidence: r.evidence} AS relationship
            ORDER BY r.score DESC
            """
        )
        papers = [dict(record["paper"]) for record in paper_result]
        relationships = [
            {"source_id": record["source_id"], "target_id": record["target_id"], "relationship": dict(record["relationship"])}
            for record in relationship_result
        ]
        return papers, relationships


def get_cached_relationship(source_id: str, target_id: str, driver: Driver) -> dict[str, Any] | None:
    with driver.session() as session:
        record = session.run(
            "MATCH (:Document {id:$source_id})-[r:SEMANTICALLY_SIMILAR]->(:Document {id:$target_id}) RETURN r",
            source_id=source_id, target_id=target_id,
        ).single()
        return dict(record["r"]) if record else None


def delete_document(doc_id: str, driver: Driver) -> bool:
    """
    Deletes a document node and all its connected relationships from Neo4j.
    """
    with driver.session() as session:
        result = session.run(
            """
            MATCH (d:Document {id: $doc_id})
            DETACH DELETE d
            RETURN count(d) AS deleted_count
            """,
            doc_id=doc_id,
        ).single()
        return (result["deleted_count"] > 0) if result else False

