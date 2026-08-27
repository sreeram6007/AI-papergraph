# PaperGraph — Backend

Welcome to the **PaperGraph Backend**! This is the Python FastAPI service that powers document upload, AI entity extraction, and graph storage for the PaperGraph project. It’s designed to be beginner-friendly, modular, and easy to run for demos, learning, or recruiting.

---

## 🚀 What Does This Backend Do?

- **Accepts Document Uploads:** PDF, TXT, and DOCX files.
- **Extracts Research Signals:** Uses spaCy for local entities/concepts and Gemini for semantic analysis.
- **Stores Knowledge Graphs:** Saves extracted data in a Neo4j graph database.
- **Serves Data via REST API:** Lets the frontend fetch documents and graph data.

---

## 🗂️ Folder Structure

```
backend/
├── .env                  # Neo4j connection settings
├── main.py               # FastAPI app entry point
├── requirements.txt      # Python dependencies
├── app/
│   ├── api/
│   │   └── routes.py     # API endpoints (upload, get docs, get graph)
│   └── services/
│       ├── file_parser.py    # PDF/TXT/DOCX parsing logic
│       ├── preprocess.py     # spaCy NLP entity extraction
│       └── neo4j.py          # Neo4j graph database functions
```

---

## 🛠️ Prerequisites

- **Python 3.10+**
- **Neo4j Database** (Community Edition is fine)
- **spaCy English Model:** `en_core_web_sm`
- **Gemini API key:** Set `GEMINI_API_KEY` in `.env` for embeddings and relationship explanations.
- **pip** (Python package manager)

---

## ⚡ Quickstart Guide

### 1. Install Python Dependencies

```sh
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

### 2. Configure Neo4j Connection

Edit `.env` with your Neo4j credentials:
```
N4J_URI=neo4j://127.0.0.1:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```
Start your Neo4j server ([Download Neo4j](https://neo4j.com/download/)).

### 3. Run the FastAPI Server

```sh
uvicorn main:app --reload
```
The backend will be available at `http://127.0.0.1:8000`.

---

## 📝 API Endpoints

- **POST `/upload`**  
  Upload up to 3 documents (PDF, TXT, DOCX).  
  - Parses files, extracts text, runs NLP, stores graph in Neo4j.

- **GET `/documents`**  
  List all uploaded documents.

- **GET `/graph/{doc_id}`**  
  Get the knowledge graph (entities & relationships) for a document.

See [`app/api/routes.py`](app/api/routes.py) for details.

---

## 🧩 How It Works (Beginner-Friendly)

1. **Upload:**  
   You send a document to `/upload`.  
   - `file_parser.py` reads and extracts text from PDF/TXT/DOCX.
2. **NLP Extraction:**  
   - `preprocess.py` uses spaCy to find entities (like people, places) and relationships.
3. **Graph Storage:**  
   - `neo4j.py` saves entities and links as nodes/edges in Neo4j.
4. **API Serving:**  
   - `routes.py` lets you fetch documents and their graphs for visualization.

---

## 💡 Tech Stack

- **FastAPI:** Modern, fast Python web framework.
- **spaCy:** Powerful NLP library for entity extraction.
- **Neo4j:** Graph database for storing relationships.
- **PyMuPDF:** PDF parsing.
- **python-docx:** DOCX parsing.

---

## 🏆 Why Is This Recruiter-Friendly?

- **Clear Structure:** Modular code, easy to follow.
- **Modern Stack:** Shows Python, NLP, and graph database skills.
- **API-First:** Ready for frontend, mobile, or other integrations.
- **Extensible:** Add new NLP models, document types, or endpoints easily.

---

## 🗃️ File Highlights

- **main.py:** Starts FastAPI app, includes CORS for frontend.
- **routes.py:** Defines all API endpoints.
- **file_parser.py:** Handles file reading and text extraction.
- **preprocess.py:** Runs spaCy NLP to extract entities.
- **neo4j.py:** Connects to Neo4j, creates nodes/edges.

---

## 🏁 Troubleshooting

- **Neo4j not running?** Start Neo4j Desktop or Community server.
- **spaCy model missing?** Run `python -m spacy download en_core_web_sm`.
- **CORS errors?** CORS is enabled for development.
- **File upload issues?** Max 3 files, 10MB each, PDF/TXT/DOCX only.

---

## 🤝 Contributing

Pull requests and issues are welcome!  
See comments in code for extension tips.

---

## 📄 License

MIT — Free for personal and commercial use.

---

**Made with ❤️ for learning, demo, and research.**