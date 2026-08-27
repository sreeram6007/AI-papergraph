# PaperGraph

PaperGraph is an open-source, full-stack application that transforms documents (PDF, TXT, DOCX) into interactive knowledge graphs using AI-powered entity extraction and visualization. Built with **FastAPI**, **Neo4j**, and **React + Vite + TailwindCSS**, it’s designed for rapid prototyping, research, and educational use.

---

## 🚀 Features

- **Document Upload:** Drag-and-drop PDF or TXT files (DOCX supported in backend) for instant processing.
- **Research Memory:** Uses spaCy for local entities and Gemini for semantic search and relationship explanations.
- **Knowledge Graph Storage:** Stores documents and entities in Neo4j graph database.
- **Interactive Visualization:** Explore your knowledge graph with zoom, pan, and tooltips.
- **Modern UI:** Responsive, beginner-friendly interface built with React, TailwindCSS, and Lucide icons.

---

## 🗂️ Project Structure

```
papergraph/
├── backend/      # FastAPI + Neo4j + spaCy (Python)
│   ├── main.py
│   ├── requirements.txt
│   ├── .env
│   └── app/
│       ├── api/routes.py
│       └── services/
│           ├── file_parser.py
│           ├── neo4j.py
│           └── preprocess.py
└── frontend/     # React + Vite + TailwindCSS (TypeScript)
    ├── src/
    │   ├── App.tsx
    │   ├── pages/
    │   │   ├── HomePage.tsx
    │   │   ├── UploadPage.tsx
    │   │   └── GraphViewerPage.tsx
    │   └── components/
    ├── package.json
    └── index.html
```

---

## 🛠️ Prerequisites

- **Python 3.10+**
- **Node.js 18+ & npm**
- **Neo4j Database** (Community Edition is fine)
- **spaCy English Model:** `en_core_web_sm`
- **Git** (optional, for cloning)

---

## ⚡ Quickstart

### 1. Clone the Repository

```sh
git clone https://github.com/yourusername/papergraph.git
cd papergraph
```

### 2. Setup Neo4j

- [Download Neo4j](https://neo4j.com/download/) and start the database.
- Default credentials in `.env`:
  ```
  NEO4J_URI=neo4j://127.0.0.1:7687
  NEO4J_USER=neo4j
  NEO4J_PASSWORD=set3password
  ```
- Update `.env` in `backend/` if needed.

### 3. Backend Setup (FastAPI)

```sh
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
uvicorn main:app --reload
```
- The backend runs at `http://127.0.0.1:8000`

### 4. Frontend Setup (React + Vite)

```sh
cd ../frontend
npm install
npm run dev
```
- The frontend runs at `http://localhost:5173`

---

## 📝 Usage

1. **Upload Documents:** Go to `/upload`, select up to 3 PDF or TXT files, and process.
2. **View Knowledge Graph:** After processing, you’ll be redirected to `/graph` to explore the extracted entities and relationships.
3. **Switch Documents:** Use the sidebar in `/graph` to view other uploaded documents.

---

## 💡 Tech Stack

- **Backend:** FastAPI, spaCy, Gemini, Neo4j, PyMuPDF, python-docx
- **Frontend:** React, Vite, TailwindCSS, Lucide Icons, Cytoscape.js
- **Database:** Neo4j (graph database)

---

## 🧑‍💻 For Recruiters & Beginners

- **Easy to Run:** No Docker or complex setup required.
- **Readable Code:** Modular, commented, and beginner-friendly.
- **Modern Stack:** Demonstrates full-stack skills with Python, TypeScript, and graph databases.
- **Extensible:** Add more NLP models, document types, or graph features easily.

---

## 🗃️ API Endpoints

- `POST /upload` — Upload and process documents.
- `GET /documents` — List all uploaded documents.
- `GET /graph/{doc_id}` — Get graph data for a document.

See [backend/app/api/routes.py](backend/app/api/routes.py) for details.

---

## 🤝 Contributing

Pull requests and issues are welcome! See [frontend/README.md](frontend/README.md) for ESLint/type-checking tips.

---

## 📚 Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Neo4j Docs](https://neo4j.com/docs/)
- [spaCy Docs](https://spacy.io/usage)
- [React Docs](https://react.dev/)
- [Cytoscape.js Docs](https://js.cytoscape.org/)

---

## 🏁 Troubleshooting

- **Neo4j not running?** Start Neo4j Desktop or Community server.
- **spaCy model missing?** Run `python -m spacy download en_core_web_sm`.
- **CORS errors?** The backend allows all origins for development.
- **File upload issues?** Max 3 files, 10MB each, PDF/TXT only (DOCX supported in backend).

---

## 📄 License

MIT — Free for personal and commercial use.

---

**Made with ❤️ for learning,