import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Path to the summaries.json file in the backend/data directory
DATA_DIR = Path(__file__).resolve().parents[2] / "data"
SUMMARIES_FILE = DATA_DIR / "summaries.json"


def _ensure_storage() -> None:
    """Ensure data directory and summaries.json file exist."""
    try:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not SUMMARIES_FILE.exists():
            with open(SUMMARIES_FILE, "w", encoding="utf-8") as f:
                json.dump({}, f, indent=2)
    except Exception:
        logger.exception("Failed to initialize summaries storage directory or file")


def load_all_summaries() -> dict[str, Any]:
    """Load all cached summaries from the JSON file."""
    _ensure_storage()
    if not SUMMARIES_FILE.exists():
        return {}
    try:
        with open(SUMMARIES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        logger.exception("Failed to read summaries from %s", SUMMARIES_FILE)
        return {}


def get_saved_summary(doc_id: str) -> str | None:
    """
    Retrieve cached summary for a given document ID.
    Returns None if not found or empty.
    """
    if not doc_id:
        return None
    summaries = load_all_summaries()
    entry = summaries.get(str(doc_id))
    if isinstance(entry, dict):
        summary_text = entry.get("simplified_abstract") or entry.get("summary")
        if summary_text and summary_text.strip():
            return summary_text.strip()
    elif isinstance(entry, str) and entry.strip():
        return entry.strip()
    return None


def save_summary(
    doc_id: str,
    summary: str,
    title: str = "",
    filename: str = "",
) -> None:
    """
    Save or update a document's summary in the JSON file.
    """
    if not doc_id or not summary or not summary.strip():
        return
    _ensure_storage()
    try:
        summaries = load_all_summaries()
        summaries[str(doc_id)] = {
            "doc_id": str(doc_id),
            "title": title,
            "filename": filename,
            "simplified_abstract": summary.strip(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        with open(SUMMARIES_FILE, "w", encoding="utf-8") as f:
            json.dump(summaries, f, indent=2, ensure_ascii=False)
        logger.info("Saved summary for document %s to %s", doc_id, SUMMARIES_FILE)
    except Exception:
        logger.exception("Failed to save summary for document %s", doc_id)


def delete_saved_summary(doc_id: str) -> bool:
    """
    Delete a document's cached summary from the JSON file.
    """
    if not doc_id:
        return False
    _ensure_storage()
    try:
        summaries = load_all_summaries()
        if str(doc_id) in summaries:
            del summaries[str(doc_id)]
            with open(SUMMARIES_FILE, "w", encoding="utf-8") as f:
                json.dump(summaries, f, indent=2, ensure_ascii=False)
            logger.info("Deleted summary for document %s from %s", doc_id, SUMMARIES_FILE)
            return True
        return False
    except Exception:
        logger.exception("Failed to delete summary for document %s", doc_id)
        return False
