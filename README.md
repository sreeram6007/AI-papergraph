# PaperGraph 📑🌐

**PaperGraph** is a full-stack research paper management and knowledge discovery platform. It transforms unstructured academic papers (PDF, DOCX, TXT) into an interactive, visual **Semantic Knowledge Graph** powered by vector embeddings, AI LLM synthesis, and graph physics.

---

## 🌟 Key Features

- **📄 Smart Document Ingestion**: Upload academic PDFs, DOCX, or TXT papers. Automatically parses section hierarchy (Abstract, Introduction, Methodology, Conclusion), cleans arXiv metadata watermarks, and classifies documents into scientific domains.
- **⚡ Two-Stage Retrieval & Reasoning Pipeline**:
  - **Stage 1 (Vector Candidate Filtering)**: Uses 768-dimensional embeddings (`gemini-embedding-001`) and vector cosine similarity to quickly retrieve candidate matches ($\text{similarity} \ge 0.5$).
  - **Stage 2 (LLM Relational Synthesis)**: Leverages `gemini-3.5-flash-lite` with structured JSON schema enforcement to analyze relationship types, confidence scores, shared concepts, and differences.
- **🕸️ Graph Database Persistence**: Stores paper nodes (`:Document`) and semantic relationships (`:SEMANTICALLY_SIMILAR`) in **Neo4j** using Cypher queries.
- **🌌 Interactive Constellation Canvas**: Powered by **Cytoscape.js** (`cose-bilkent` physics layout), featuring spotlight neighborhood highlighting, domain cluster filter bars, and card-based node visual layouts.
- **⚡ Persistent AI Summary Caching**: Caches Gemini paper summaries locally to avoid redundant API calls, with on-demand refresh capability.

---

## 🏗️ System Architecture

```
+-------------------------------------------------------------------+
|                     REACT 19 FRONTEND (Vite)                      |
|  - Cytoscape.js Graph Canvas                                      |
|  - Topic Domain Cluster Filtering                                 |
|  - Paper Dossier & Summary Drawer                                  |
+---------------------------------+---------------------------------+
                                  | HTTP / REST (JSON)
                                  v
+-------------------------------------------------------------------+
|                    FASTAPI BACKEND SERVER (Python)                |
|  - Section Parsing & Title Extraction                             |
|  - Background Tasks Async Pipeline                                |
|  - Vector Cosine Similarity Engine                                |
|  - Google GenAI SDK (Embeddings & Reasoning)                      |
+---------------------------------+---------------------------------+
                                  | Bolt Protocol (:7687)
                                  v
+-------------------------------------------------------------------+
|                        NEO4J GRAPH DATABASE                       |
|  - (:Document) Nodes & [:SEMANTICALLY_SIMILAR] Relationships      |
+-------------------------------------------------------------------+
```

---

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: Neo4j Graph Database
- **AI / LLM**: Google GenAI SDK (`gemini-embedding-001`, `gemini-3.5-flash-lite`)
- **Parsers**: PyMuPDF (`fitz`), `python-docx`

### Frontend
- **Framework**: React 19 + TypeScript + Vite
- **Graph Renderer**: Cytoscape.js (`cytoscape-cose-bilkent`)
- **Styling**: TailwindCSS v4 + Lucide Icons

---

## 📁 Project Structure

```
papergraph/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py           # REST Endpoints
│   │   └── services/
│   │       ├── config.py           # Environment config
│   │       ├── file_parser.py      # PDF / DOCX byte parsers
│   │       ├── gemini.py           # Gemini API Client
│   │       ├── neo4j.py            # Cypher DAO
│   │       ├── preprocess.py       # Title & Domain heuristics
│   │       ├── relationship.py     # Cosine math & 2-Stage pipeline
│   │       └── summary_store.py    # Local JSON summary store
│   ├── .env.example                # Sample configuration
│   ├── main.py                     # FastAPI Entrypoint
│   └── requirements.txt            # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI components
│   │   ├── pages/                  # HomePage, UploadPage, GraphViewerPage
│   │   ├── App.css                 # Custom Graph & Theme styles
│   │   └── App.tsx                 # Router & Theme Provider
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Active Neo4j Instance (Local Desktop, Docker, or AuraDB)
- Gemini API Key

### 2. Backend Setup

```bash
cd backend

# Create & activate virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Configure your `backend/.env`:
```env
NEO4J_URI=neo4j://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
GEMINI_API_KEY=your_gemini_api_key
```

Run the backend development server:
```bash
uvicorn main:app --reload
```
The backend API will be available at `http://127.0.0.1:8000`.

### 3. Frontend Setup

```bash
cd ../frontend

# Install node dependencies
npm install

# Start Vite dev server
npm run dev
```
The application will be running at `http://localhost:5173`.

---

## 🔌 API Reference

| Method | Endpoint | Purpose |
| :--- | :--- | :--- |
| `POST` | `/upload` | Upload PDF/TXT/DOCX files & queue semantic analysis |
| `GET` | `/graph/{doc_id}` | Fetch node & edge data for Cytoscape map |
| `GET` | `/paper/{doc_id}/summary` | Retrieve cached or generated paper summary |
| `POST` | `/paper/{doc_id}/summary/refresh` | Force regenerate AI summary via Gemini |
| `DELETE` | `/paper/{doc_id}` | Cascade delete paper and connected relationships |
| `GET` | `/documents` | List all library documents |
| `GET` | `/search?q={query}` | Hybrid vector & text search |

