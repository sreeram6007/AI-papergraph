import json
import logging
from typing import Any

from app.services.config import GEMINI_API_KEY, GEMINI_EMBEDDING_MODEL, GEMINI_MODEL

logger = logging.getLogger(__name__)
RELATIONSHIP_TYPES = {
    "semantically_similar", "same_topic", "extends", "uses_method_from",
    "builds_on", "compares_with", "improves", "contradicts", "uses_dataset_from",
    "related_background", "weakly_related",
}


def _client():
    if not GEMINI_API_KEY:
        return None
    try:
        from google import genai
        return genai.Client(api_key=GEMINI_API_KEY)
    except Exception:
        logger.exception("Gemini SDK is unavailable")
        return None


def simplify_abstract(abstract: str) -> str | None:
    client = _client()
    if client is None or not abstract.strip():
        return None
    prompt = "Rewrite this research abstract in 2-4 clear sentences for an intelligent non-specialist. Preserve the findings and scope. Do not add claims. Return JSON only with a single 'summary' string.\n\nABSTRACT:\n" + abstract[:6000]
    try:
        from google.genai import types
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {"summary": {"type": "STRING"}},
                    "required": ["summary"],
                },
                temperature=0.1,
            ),
        )
        summary = json.loads(response.text).get("summary", "").strip()
        return summary or None
    except Exception:
        logger.exception("Gemini abstract simplification failed")
        return None


def _profile_text(profile: dict[str, Any]) -> str:
    return json.dumps(profile, ensure_ascii=True, separators=(",", ":"))[:18000]


def embed_text(text: str) -> list[float] | None:
    client = _client()
    if client is None or not text.strip():
        return None
    try:
        response = client.models.embed_content(model=GEMINI_EMBEDDING_MODEL, contents=text[:16000])
        values = getattr(response.embeddings[0], "values", None)
        return list(values) if values else None
    except Exception:
        logger.exception("Gemini embedding failed")
        return None


def analyze_relationship(source: dict[str, Any], target: dict[str, Any]) -> dict[str, Any] | None:
    client = _client()
    if client is None:
        return None
    prompt = f"""Analyze the relationship between two research papers. Use only evidence in the supplied profiles.
Do not call two papers 'extends', 'builds_on', 'improves', 'uses_method_from', 'uses_dataset_from', 'compares_with', or 'contradicts' without explicit evidence. If evidence is weak, use semantically_similar, same_topic, related_background, or weakly_related. Return JSON only.
Allowed relationship_type values: {sorted(RELATIONSHIP_TYPES)}
Required JSON keys: relationship_type, confidence, similarity_reason, shared_topics, shared_methods, shared_concepts, shared_datasets, differences, explanation, evidence

SOURCE PAPER:
{_profile_text(source)}

TARGET PAPER:
{_profile_text(target)}"""
    schema = {
        "type": "OBJECT",
        "properties": {
            "relationship_type": {"type": "STRING"},
            "confidence": {"type": "NUMBER"},
            "similarity_reason": {"type": "STRING"},
            "shared_topics": {"type": "ARRAY", "items": {"type": "STRING"}},
            "shared_methods": {"type": "ARRAY", "items": {"type": "STRING"}},
            "shared_concepts": {"type": "ARRAY", "items": {"type": "STRING"}},
            "shared_datasets": {"type": "ARRAY", "items": {"type": "STRING"}},
            "differences": {"type": "ARRAY", "items": {"type": "STRING"}},
            "explanation": {"type": "STRING"},
            "evidence": {"type": "ARRAY", "items": {"type": "STRING"}},
        },
        "required": ["relationship_type", "confidence", "similarity_reason", "shared_topics", "shared_methods", "shared_concepts", "shared_datasets", "differences", "explanation", "evidence"],
    }
    try:
        from google.genai import types
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=schema, temperature=0.1),
        )
        result = json.loads(response.text)
        relationship_type = result.get("relationship_type")
        confidence = float(result.get("confidence", 0))
        if relationship_type not in RELATIONSHIP_TYPES or not 0 <= confidence <= 1:
            return None
        result["confidence"] = confidence
        return result
    except Exception:
        logger.exception("Gemini relationship analysis failed")
        return None
