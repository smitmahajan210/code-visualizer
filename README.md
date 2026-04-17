# 🎨 Code Visualizer

A full-stack web application that lets you paste any code and instantly see:
- **Syntax highlighting** (powered by Prism.js)
- **Code structure analysis** — functions, classes, variables, imports
- **Code statistics** — lines, comments, characters, function count
- **Dark / Light theme toggle**
- **File upload** support
- **Language auto-detection** with manual override

---

## 🗂 Project Structure

```
code-visualizer/
├── frontend/               # React + Vite + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx       # Code input with line numbers & toolbar
│   │   │   ├── CodeVisualization.jsx # Highlighted output + structure panels
│   │   │   ├── ThemeToggle.jsx      # Dark/light mode button
│   │   │   └── Stats.jsx            # Metrics stat cards
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── backend/                # Node.js + Express API
│   ├── routes/
│   │   └── analyzeCode.js
│   ├── utils/
│   │   ├── codeAnalyzer.js
│   │   └── languageDetector.js
│   ├── server.js
│   └── package.json
├── .gitignore
└── README.md
```

---

## 🚀 Running Locally

### Prerequisites
- **Node.js** v16 or higher — [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/smitmahajan210/code-visualizer.git
cd code-visualizer
```

---

### Step 2 — Start the Backend

Open a terminal window and run:

```bash
cd backend
npm install
npm start
```

The backend API will be available at: **http://localhost:5000**

---

### Step 3 — Start the Frontend

Open a **second terminal window** (keep the backend running) and run:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at: **http://localhost:5173**

---

### Step 4 — Open in browser

Visit **http://localhost:5173** and start pasting code! 🎉

---

## 🛠 Supported Languages

| Language       | Syntax Highlighting | Structure Analysis |
|---------------|--------------------|--------------------|
| JavaScript    | ✅                  | ✅ Functions, classes, variables, imports |
| TypeScript    | ✅                  | ✅ + Interfaces, types |
| Python        | ✅                  | ✅ Functions, classes, variables, imports |
| Java          | ✅                  | ✅ Methods, classes, imports |
| C++           | ✅                  | ✅ Functions, classes, includes |
| C#            | ✅                  | — |
| HTML          | ✅                  | ✅ Tags, IDs, class names |
| CSS           | ✅                  | ✅ Selectors, properties |
| SQL           | ✅                  | ✅ Tables, query types |
| Rust          | ✅                  | — |
| Go            | ✅                  | — |
| Ruby          | ✅                  | — |
| PHP           | ✅                  | — |

---

## 📡 API Endpoints

| Method | Endpoint              | Description                     |
|--------|-----------------------|---------------------------------|
| POST   | `/api/analyze`        | Analyze code structure & metrics |
| POST   | `/api/detect-language`| Detect language of code snippet  |
| GET    | `/`                   | Health check                     |

### Example request

```bash
curl -X POST http://localhost:5000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"code": "function hello() { console.log(\"hi\"); }", "language": "javascript"}'
```

---

## 🧰 Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18, Vite 5, Tailwind CSS 3  |
| Icons    | React Icons                       |
| Syntax   | Prism.js                          |
| Backend  | Node.js, Express 4                |
| CORS     | cors middleware                   |