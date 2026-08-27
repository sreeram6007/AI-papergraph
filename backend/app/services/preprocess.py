import re
from importlib import import_module
from typing import Any

try:
    spacy = import_module("spacy")
    _NLP = spacy.load("en_core_web_sm")
except Exception:
    _NLP = None


SECTION_NAMES = {
    "abstract": ("abstract",),
    "introduction": ("introduction", "background"),
    "methodology": ("methodology", "methods", "method", "approach"),
    "conclusion": ("conclusion", "conclusions", "discussion"),
}

ACRONYMS = {
    "AI", "ML", "DL", "NLP", "LLM", "LLMS", "KG", "KGS", "RAG", "GPT",
    "BERT", "BERTS", "ZEP", "CNN", "RNN", "LSTM", "GNN", "API", "APIS",
    "UI", "UX", "DNA", "RNA", "COVID", "COVID-19", "3D", "2D", "4D",
    "SQL", "NOSQL", "HTTP", "HTTPS", "PDF", "AGI", "VLMS", "VLM",
    "ICLR", "NIPS", "NEURIPS", "CVPR", "ACL", "EMNLP", "KDD", "WWW",
    "SIGIR", "AAAI", "IJCAI", "VAE", "GAN", "RL", "RLHF", "DPO"
}

LOWERCASE_WORDS = {
    "a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to",
    "from", "by", "with", "in", "of", "over", "into", "through", "during",
    "before", "after", "via", "as"
}

NOISE_PATTERNS = [
    r"^arxiv\s*:\s*\S+",
    r"^\d{4}\.\d{4,5}(?:v\d+)?",
    r"^\[\s*[a-zA-Z0-9\.\-]+\s*\]",
    r"^(?:preprint|under review|conference|proceedings|journal|submitted to|accepted at|draft)\b",
    r"^(?:ieee|acm|springer|elsevier|nature|science|neurips|icml|iclr|aaai|acl|emnlp|cvpr)\b",
    r"^(?:http|https)://\S+",
    r"^doi\s*:\s*\S+",
    r"^\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4}",
    r"^page\s+\d+",
    r"^\d+$",
]

DOMAINS = [
    {
        "name": "Computer Science & AI",
        "keywords": [
            "ai", "artificial intelligence", "machine learning", "deep learning", "neural", "llm", "language model",
            "transformer", "graph", "knowledge graph", "agent", "autonomous", "nlp", "computer vision", "algorithm",
            "software", "code", "embedding", "retrieval", "rag", "reasoning", "benchmark", "prompt", "fine-tuning",
            "diffusion", "generative", "dataset", "accuracy", "attention", "zep", "temporal"
        ],
        "color": "#e11d48",  # Crimson Rose
    },
    {
        "name": "Biological & Medical Sciences",
        "keywords": [
            "protein", "gene", "genomics", "dna", "rna", "molecular", "cell", "cellular", "biology", "biological",
            "medicine", "medical", "disease", "clinical", "patient", "therapy", "cancer", "antibody", "mutation",
            "tissue", "biomedical", "pathology", "pharmacology", "drug", "health", "bioinformatics"
        ],
        "color": "#059669",  # Emerald Green
    },
    {
        "name": "Neuroscience & Cognitive Science",
        "keywords": [
            "brain", "neuroscience", "cortex", "neuron", "synaptic", "cognitive", "cognition", "memory", "perception",
            "psychology", "mental", "behavior", "consciousness", "eeg", "fmri", "brain computer"
        ],
        "color": "#7c3aed",  # Royal Violet
    },
    {
        "name": "Physics & Engineering",
        "keywords": [
            "quantum", "physics", "thermodynamics", "energy", "mechanics", "optics", "gravity", "semiconductor",
            "nanotechnology", "robotics", "hardware", "signal", "electronics", "aerospace", "renewable energy"
        ],
        "color": "#d97706",  # Amber Ochre
    },
    {
        "name": "Data Systems & Web",
        "keywords": [
            "storage", "throughput", "latency", "streaming", "kafka", "redis", "postgres", "sql", "nosql",
            "browser", "frontend", "backend", "web", "react", "javascript", "cloud", "serverless", "infrastructure",
            "distributed systems", "database", "network"
        ],
        "color": "#0284c7",  # Sky Blue
    },
]


def classify_paper_domain(title: str, text: str = "") -> dict[str, str]:
    """Classify paper into scientific/technical domain for visual clustering."""
    haystack = f"{title} {text[:4000]}".lower()
    best_domain = "Computer Science & AI"
    best_score = 0
    best_color = "#f87171"

    for dom in DOMAINS:
        score = sum(1 for kw in dom["keywords"] if re.search(rf"\b{re.escape(kw)}\b", haystack))
        if score > best_score:
            best_score = score
            best_domain = dom["name"]
            best_color = dom["color"]

    return {"domain": best_domain, "domain_color": best_color}


def clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def is_noise_line(line: str) -> bool:
    line_clean = line.strip().lower()
    if not line_clean or len(line_clean) < 3:
        return True
    if any(re.search(pat, line_clean, re.IGNORECASE) for pat in NOISE_PATTERNS):
        return True
    if "@" in line_clean and "." in line_clean:
        return True
    return False


def is_author_line(line: str) -> bool:
    line_clean = line.strip()
    if not line_clean:
        return False
    if re.search(r"\b(?:university|institute|laboratory|department|school of|corporation|inc\.|llc|technologies|google|meta|microsoft|openai|deepmind|amazon|apple)\b", line_clean, re.IGNORECASE):
        return True
    if "@" in line_clean or "{" in line_clean or "}" in line_clean:
        return True
    parts = [p.strip() for p in re.split(r",|\sand\s", line_clean) if p.strip()]
    if len(parts) >= 2:
        name_like = 0
        for part in parts:
            words = [re.sub(r"[\d\*\†\‡\§\#\^]+", "", w) for w in part.split()]
            words = [w for w in words if w]
            if 1 <= len(words) <= 4 and all(w[0].isupper() or w.lower() in {"de", "van", "von", "al."} for w in words):
                name_like += 1
        if name_like >= 2:
            return True
    if re.match(r"^(?:by|authors?)\s*:", line_clean, re.IGNORECASE):
        return True
    return False


def smart_title_case(text: str) -> str:
    """Format string into professional title case while preserving technical acronyms."""
    if not text:
        return ""
    text = clean_text(text)
    words = text.split()
    formatted_words = []
    for i, word in enumerate(words):
        leading_match = re.match(r"^[\W_]*", word)
        leading = leading_match.group(0) if leading_match else ""
        trailing_match = re.search(r"[\W_]*$", word)
        trailing = trailing_match.group(0) if trailing_match else ""
        core = word[len(leading):len(word) - len(trailing) if trailing else len(word)]

        if not core:
            formatted_words.append(word)
            continue

        upper_core = core.upper()
        if upper_core in ACRONYMS:
            formatted_core = upper_core
        elif core.lower() in LOWERCASE_WORDS and i != 0 and not (formatted_words and formatted_words[-1].endswith(":")):
            formatted_core = core.lower()
        else:
            formatted_core = core[0].upper() + core[1:].lower()

        formatted_words.append(f"{leading}{formatted_core}{trailing}")

    result = " ".join(formatted_words)
    result = re.sub(r"\s*:\s*", ": ", result)
    return result.strip()


def extract_paper_title(text: str, filename: str = "") -> str:
    """Intelligently extract the true paper title from document text or filename."""
    lines = [l.strip() for l in (text or "").splitlines() if l.strip()]
    candidate_lines = []

    for line in lines[:15]:
        if is_noise_line(line):
            continue
        if re.match(r"^(?:abstract|introduction|1[\.\s]|keywords?|table of contents|contents)\b", line, re.IGNORECASE):
            break
        if is_author_line(line):
            if candidate_lines:
                break
            continue

        candidate_lines.append(line)
        if len(" ".join(candidate_lines).split()) >= 16:
            break

    if candidate_lines:
        raw_title = " ".join(candidate_lines)
        raw_title = re.sub(r"[\"'\-—\s]+$", "", raw_title).strip()
        if len(raw_title) >= 5:
            return smart_title_case(raw_title)

    if filename:
        clean_fn = filename.rsplit("/", 1)[-1]
        clean_fn = re.sub(r"\.(?:pdf|docx|txt)$", "", clean_fn, flags=re.IGNORECASE)
        if re.match(r"^\d{4}\.\d{4,5}(?:v\d+)?$", clean_fn):
            return f"arXiv:{clean_fn}"
        clean_fn = re.sub(r"[_\-]+", " ", clean_fn)
        return smart_title_case(clean_fn)

    return "Untitled Research Paper"


def clean_title(title: str, filename: str = "") -> str:
    """Format an existing title or extract cleanly."""
    if not title or title.strip().endswith((".pdf", ".docx", ".txt")) or re.match(r"^\d{4}\.\d{4,5}", title.strip()):
        return extract_paper_title("", filename=filename or title)
    return smart_title_case(title)


def extract_authors(text: str, title: str = "") -> str:
    """Extract clean author list from document text."""
    lines = [l.strip() for l in (text or "").splitlines() if l.strip()]
    authors = []
    found_title = False
    for line in lines[:15]:
        if is_noise_line(line):
            continue
        if re.match(r"^(?:abstract|introduction|1[\.\s]|keywords?)\b", line, re.IGNORECASE):
            break
        if title and (title.lower() in line.lower() or line.lower() in title.lower()):
            found_title = True
            continue
        if found_title or len(authors) > 0:
            if re.search(r"\b(?:abstract|introduction|keywords?)\b", line, re.IGNORECASE):
                break
            if "@" in line or re.search(r"\b(?:department|university|laboratory|institute)\b", line, re.IGNORECASE):
                continue
            authors.append(line)
            if len(authors) >= 2:
                break
    if authors:
        combined = " ".join(authors)
        combined = re.sub(r"[\d\*\†\‡\§\#]+", "", combined)
        combined = re.sub(r"\s+", " ", combined).strip()
        return combined[:200]
    return ""


def chunk_text(text: str, max_length: int = 500) -> list[str]:
    words = text.split()
    return [" ".join(words[index:index + max_length]) for index in range(0, len(words), max_length)]


def _section(text: str, headings: tuple[str, ...], limit: int = 5000) -> str:
    heading_pattern = "|".join(re.escape(name) for name in headings)
    match = re.search(
        rf"\b(?:{heading_pattern})\b\s*[:.]?\s*(.*?)(?=\b(?:abstract|introduction|background|methodology|methods?|approach|results?|discussion|conclusions?)\b\s*[:.]?|$)",
        text,
        re.IGNORECASE,
    )
    return clean_text(match.group(1))[:limit] if match else ""


def build_paper_profile(text: str, filename: str = "") -> dict[str, Any]:
    """Build a bounded paper representation for embeddings, clustering and Gemini."""
    cleaned = clean_text(text)
    sections = {name: _section(text or "", headings) for name, headings in SECTION_NAMES.items()}
    if not sections["abstract"]:
        sections["abstract"] = cleaned[:4000]
    profile_text = "\n\n".join(
        f"{name.title()}: {value}" for name, value in sections.items() if value
    ) or cleaned[:12000]

    title = extract_paper_title(text, filename)
    authors = extract_authors(text, title)
    domain_info = classify_paper_domain(title, sections["abstract"] or cleaned)

    return {
        "title": title,
        "authors": authors,
        "year": int(year.group(0)) if (year := re.search(r"\b(?:19|20)\d{2}\b", cleaned)) else None,
        "abstract": sections["abstract"],
        "introduction": sections["introduction"],
        "methodology": sections["methodology"],
        "conclusion": sections["conclusion"],
        "domain": domain_info["domain"],
        "domain_color": domain_info["domain_color"],
        "text": profile_text[:16000],
        "text_available": len(cleaned) >= 80,
    }


def _legacy_entities_and_concepts(chunks: list[str]) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Keep the existing graph enrichment when the local spaCy model is available."""
    entities: list[dict[str, str]] = []
    concepts: list[dict[str, str]] = []
    seen_entities: set[tuple[str, str]] = set()
    seen_concepts: set[str] = set()
    if _NLP is None:
        return entities, concepts
    for chunk in chunks:
        document = _NLP(chunk)
        for entity in document.ents:
            key = (entity.text.strip().lower(), entity.label_)
            if key not in seen_entities:
                seen_entities.add(key)
                entities.append({"text": entity.text, "label": entity.label_})
        for noun_chunk in document.noun_chunks:
            phrase = noun_chunk.text.strip()
            key = re.sub(r"[^\w\s-]", "", phrase.lower()).strip()
            meaningful = [token for token in noun_chunk if not token.is_stop and not token.is_punct]
            if key and len(meaningful) >= 2 and any(token.pos_ in {"NOUN", "PROPN"} for token in noun_chunk) and key not in seen_concepts:
                seen_concepts.add(key)
                concepts.append({"text": phrase, "key": key})
    return entities, concepts


def preprocess_document(text: str, filename: str = "") -> dict[str, Any]:
    profile = build_paper_profile(text, filename)
    chunks = chunk_text(clean_text(text))
    entities, concepts = _legacy_entities_and_concepts(chunks)
    return {"chunks": chunks, "profile": profile, "entities": entities, "concepts": concepts}
