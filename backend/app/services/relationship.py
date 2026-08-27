import math
from typing import Any

from app.services.gemini import analyze_relationship, embed_text, simplify_abstract
from app.services.neo4j import (
    get_cached_relationship,
    get_documents_with_embeddings,
    save_semantic_relationship,
    set_embedding,
    set_simplified_abstract,
)
from app.services.summary_store import get_saved_summary, save_summary


def _vector_text(document: dict[str, Any]) -> str:
    return " ".join(str(document.get(key, "")) for key in ("title", "abstract", "introduction", "methodology", "conclusion"))


def cosine_similarity(first: list[float], second: list[float]) -> float:
    numerator = sum(a * b for a, b in zip(first, second))
    first_norm = math.sqrt(sum(value * value for value in first))
    second_norm = math.sqrt(sum(value * value for value in second))
    return numerator / (first_norm * second_norm) if first_norm and second_norm else 0.0


def retrieve_candidates(query_embedding: list[float], documents: list[dict[str, Any]], limit: int = 10) -> list[dict[str, Any]]:
    scored = []
    for document in documents:
        embedding = document.get("embedding")
        if embedding:
            scored.append((cosine_similarity(query_embedding, embedding), document))
    scored.sort(key=lambda item: item[0], reverse=True)
    return [{"score": round(score, 4), "paper": document} for score, document in scored[:limit]]


def analyze_new_paper(document: dict[str, Any], driver: Any, limit: int = 10) -> None:
    doc_id = document.get("id")
    cached_summary = get_saved_summary(doc_id) if doc_id else None
    if cached_summary:
        set_simplified_abstract(doc_id, cached_summary, driver)
    elif document.get("abstract") and not document.get("simplified_abstract"):
        summary = simplify_abstract(document["abstract"])
        if summary and doc_id:
            save_summary(doc_id, summary, title=document.get("title", ""), filename=document.get("filename", ""))
            set_simplified_abstract(doc_id, summary, driver)
    embedding = embed_text(_vector_text(document))

    if not embedding:
        return
    set_embedding(document["id"], embedding, driver)
    candidates = retrieve_candidates(embedding, [item for item in get_documents_with_embeddings(driver) if item.get("id") != document["id"]], limit)
    for candidate in candidates:
        if candidate["score"] < 0.5:
            continue
        target = candidate["paper"]
        if get_cached_relationship(document["id"], target["id"], driver) or get_cached_relationship(target["id"], document["id"], driver):
            continue
        analysis = analyze_relationship(document, target)
        if analysis and analysis["confidence"] >= 0.55:
            analysis["score"] = candidate["score"]
            save_semantic_relationship(document["id"], target["id"], analysis, driver)


def search_documents(query: str, driver: Any, limit: int = 20) -> list[dict[str, Any]]:
    documents = get_documents_with_embeddings(driver)
    query_embedding = embed_text(query)
    if query_embedding:
        results = retrieve_candidates(query_embedding, documents, limit)
    else:
        query_terms = {term.lower() for term in query.split() if len(term) > 2}
        results = []
        for document in documents:
            haystack = _vector_text(document).lower()
            overlap = sum(term in haystack for term in query_terms)
            if overlap:
                results.append({"score": round(overlap / max(len(query_terms), 1), 4), "paper": document})
        results.sort(key=lambda item: item["score"], reverse=True)
        results = results[:limit]
    for result in results:
        result["reason"] = result["paper"].get("abstract", "")[:220] or "Relevant semantic match in your research library."
        result["paper"].pop("embedding", None)
    return results
