# PaperGraph — Frontend

Welcome to the **PaperGraph Frontend**! This is a modern, beginner-friendly React application that lets users upload documents and explore AI-generated knowledge graphs. It’s designed to be easy to run, understand, and extend—perfect for learning and showcasing your skills to recruiters.

---

## 🌟 What Does This Frontend Do?

- **Document Upload:** Drag-and-drop PDF, TXT, or DOCX files for processing.
- **Progress Feedback:** See upload and processing status in real time.
- **Knowledge Graph Visualization:** Explore entities and relationships extracted from your documents.
- **Responsive UI:** Works on desktop and mobile, with a clean, modern look.

---

## 🗂️ Folder Structure

```
frontend/
├── public/                # Static assets
│   └── vite.svg
├── src/
│   ├── App.tsx            # Main app component
│   ├── App.css            # Global styles
│   ├── main.tsx           # Entry point
│   ├── assets/            # Images and icons
│   ├── components/        # Reusable UI and layout
│   │   ├── Layout.tsx
│   │   └── ui/
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── progress.tsx
│   │       └── sonner.tsx
│   ├── declarations/      # TypeScript custom types
│   │   └── custom.d.ts
│   ├── lib/               # Utility functions
│   │   └── utils.ts
│   ├── pages/             # Main pages
│   │   ├── HomePage.tsx
│   │   ├── UploadPage.tsx
│   │   └── GraphViewerPage.tsx
│   └── vite-env.d.ts      # Vite environment types
├── index.html             # HTML template
├── package.json           # NPM dependencies and scripts
├── vite.config.ts         # Vite configuration
├── tsconfig*.json         # TypeScript configs
├── eslint.config.js       # Linting rules
└── .gitignore
```

---

## 🛠️ Prerequisites

- **Node.js 18+**
- **npm** (comes with Node.js)
- **Backend running** (see `/backend/README.md` for setup)

---

## ⚡ Quickstart

1. **Install dependencies:**

   ```sh
   npm install
   ```

2. **Start the development server:**

   ```sh
   npm run dev
   ```

   The app will be available at [http://localhost:5173](http://localhost:5173).

---

## 📝 How It Works (Step-by-Step)

1. **Home Page (`HomePage.tsx`):**
   - Welcome screen with project info and navigation.

2. **Upload Page (`UploadPage.tsx`):**
   - Drag-and-drop or select up to 3 documents (PDF, TXT, DOCX).
   - Shows upload progress and status.
   - Sends files to backend `/upload` endpoint.

3. **Graph Viewer Page (`GraphViewerPage.tsx`):**
   - Displays interactive knowledge graph for the selected document.
   - Shows entities (nodes) and relationships (edges).
   - Lets you switch between uploaded documents.

4. **Reusable UI Components (`components/ui/`):**
   - **button.tsx:** Consistent buttons for actions.
   - **card.tsx:** Card layouts for document previews.
   - **progress.tsx:** Progress bars for uploads and processing.
   - **sonner.tsx:** Toast notifications for feedback.

5. **Layout (`components/Layout.tsx`):**
   - Handles page structure, navigation, and responsiveness.

6. **Utilities (`lib/utils.ts`):**
   - Helper functions for formatting, API calls, etc.

---

## 💡 Why Is This Recruiter-Friendly?

- **Modern Stack:** React, Vite, TypeScript, TailwindCSS.
- **Clear Structure:** Modular, commented, and easy to follow.
- **Responsive Design:** Works on all devices.
- **API Integration:** Demonstrates frontend-backend communication.
- **Extensible:** Add new pages, components, or features easily.
- **Best Practices:** Uses ESLint, TypeScript, and clean code conventions.

---

## 🏁 Troubleshooting

- **Backend not running?** Start the backend first (see `/backend/README.md`).
- **API errors?** Check backend URL in API calls.
- **Styling issues?** Make sure TailwindCSS is installed and configured.
- **Type errors?** Run `npm run type-check` to find and fix TypeScript issues.

---

## 🤝 Contributing

Pull requests and issues are welcome!  
Check code comments for extension tips and follow ESLint/type-checking for consistency.

---

## 📄 License

MIT — Free for personal and commercial use.

---

**Made with ❤️ for learning, demo, and research.**