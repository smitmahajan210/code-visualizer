# 🎨 Code Visualizer

A full-stack interactive code visualization tool that lets you paste any code and **step through its execution line by line** with real-time visual state. 

> **New:** Side-by-side layout, array/pointer visualization with L/R markers, speed control, event indicators, and enhanced variable display.

---

## ✨ Features

### Code Editor (Left Panel)
- **Syntax highlighting** powered by Prism.js
- **Language selector** — Auto-detect or pick from 13+ languages
- **File upload** — Drop a code file directly
- **Clipboard paste** — One-click paste from clipboard
- **Collapsible Structure Analysis** — Functions, classes, variables, imports

### Step-by-Step Execution (Right Panel)
- **Run & Trace** — Step-by-step execution currently supports **Python, JavaScript, TypeScript, Java, and C++**
- **Code panel** — Shows executing code with the current line highlighted in yellow; next line in blue
- **Array / list visualization** — Elements displayed as bordered boxes with index labels
- **L / R / M pointer markers** — Automatically detected from variables named `left`, `right`, `l`, `r`, `mid`, `i`, `j`, etc., shown as color-coded arrows above array cells
- **Variable watcher** — All active variables displayed with type badges (int, str, list, …)
- **Call stack** — Shows all active frames; inner/active frame is highlighted
- **Return value & exception** — Displayed as a distinct badge when a function returns or raises
- **Event type badge** — `→ Executing`, `📞 Function call`, `↩ Return`, `⚠ Exception`

### Controls
| Control | Description |
|---------|-------------|
| ▶ / ⏸ Play/Pause | Auto-advance through steps |
| ◄ / ► Step | Move one step backward or forward |
| \|◄ / ►\| Jump | Jump to first or last step |
| ↺ Reset | Return to step 1 |
| Speed slider | Control auto-play speed (100 ms – 2 s per step) |
| Progress bar | Visual indicator of position in the trace |

### UI
- **Dark/Light theme toggle**
- **Responsive layout** — Two-column side-by-side on large screens, stacked on mobile
- **Stat cards** — Total lines, code lines, comments, functions, classes, characters
- **Professional dark theme** with gradient backgrounds and glassmorphism panels

---

## 🗂 Project Structure

```
code-visualizer/
├── frontend/                         # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── CodeEditor.jsx        # Editable code input with syntax highlighting
│   │   │   ├── ExecutionVisualizer.jsx  # Step-by-step execution panel (all visual features)
│   │   │   ├── CodeVisualization.jsx # Structure analysis (functions, classes, etc.)
│   │   │   ├── ThemeToggle.jsx       # Dark/light mode button
│   │   │   └── Stats.jsx             # Metrics stat cards
│   │   ├── App.jsx                   # Two-column side-by-side layout
│   │   ├── App.css                   # Glassmorphism, animations, slider styles
│   │   └── index.css                 # Prism token colours + scrollbar
│   ├── package.json
│   ├── vite.config.js                # Dev proxy → backend :5001
│   └── index.html
├── backend/                          # Node.js + Express
│   ├── routes/
│   │   ├── analyzeCode.js            # POST /api/analyze
│   │   └── trace.js                  # POST /api/trace
│   ├── utils/
│   │   ├── jsTracer.js               # JavaScript tracer (acorn AST + vm sandbox)
│   │   ├── pythonTracer.js           # Spawns tracer_runner.py
│   │   ├── codeAnalyzer.js
│   │   └── languageDetector.js
│   ├── tracer_runner.py              # Python sys.settrace tracer
│   └── server.js
├── .gitignore
└── README.md
```

---

## 🚀 Running Locally

### Prerequisites
- **Node.js** v16 or higher — [Download](https://nodejs.org/)
- **Python 3** — [Download](https://www.python.org/)
- **npm** (comes with Node.js)

---

### Step 1 — Clone the repository

```bash
git clone https://github.com/smitmahajan210/code-visualizer.git
cd code-visualizer
```

---

### Step 2 — Start the Backend

```bash
cd backend
npm install
npm start
```

The backend API will be available at: **http://localhost:5001**

---

### Step 3 — Start the Frontend

Open a **second terminal window** (keep the backend running):

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at: **http://localhost:5173**

---

### Step 4 — Open in browser

Visit **http://localhost:5173**, paste code, and click **Run & Trace**! 🎉

---

## 📸 Screenshots

### Initial layout — two-column side-by-side
![Initial layout](https://github.com/user-attachments/assets/ea744278-ebbf-4d97-9f74-9470aa74e349)

### Two-pointer algorithm — array + L/R markers + variable watcher
![Array visualization](https://github.com/user-attachments/assets/a11b6ecb-0783-499a-8d87-bffc8714f17d)

### Full view — code execution + speed slider + output
![Full view](https://github.com/user-attachments/assets/fe881476-52b5-4f3a-ac90-4494535d32ec)

---

## 🔖 Example Programs to Try

### Two-pointer (Python)

```python
nums = [2, 7, 11, 15]
target = 9
left = 0
right = len(nums) - 1

while left < right:
    s = nums[left] + nums[right]
    if s == target:
        print(f"Found: {nums[left]} + {nums[right]} = {target}")
        break
    elif s < target:
        left += 1
    else:
        right -= 1
```

### Fibonacci (JavaScript)

```javascript
function fib(n) {
  if (n <= 1) return n;
  return fib(n - 1) + fib(n - 2);
}

const result = fib(6);
console.log("fib(6) =", result);
```

### Bubble sort (Python)

```python
arr = [64, 34, 25, 12, 22, 11, 90]
n = len(arr)
for i in range(n):
    for j in range(0, n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
print(arr)
```

---

## 🛠 Supported Languages

| Language       | Syntax Highlighting | Structure Analysis | Step Execution |
|---------------|--------------------|--------------------|----------------|
| JavaScript    | ✅ | ✅ Functions, classes, variables, imports | ✅ |
| Python        | ✅ | ✅ Functions, classes, variables, imports | ✅ |
| TypeScript    | ✅ | ✅ + Interfaces, types | — |
| Java          | ✅ | ✅ Methods, classes, imports | — |
| C++           | ✅ | ✅ Functions, classes, includes | — |
| C#            | ✅ | — | — |
| HTML          | ✅ | ✅ Tags, IDs, class names | — |
| CSS           | ✅ | ✅ Selectors, properties | — |
| SQL           | ✅ | ✅ Tables, query types | — |
| Rust / Go / Ruby / PHP | ✅ | — | — |

---

## 📡 API Endpoints

| Method | Endpoint              | Description                                    |
|--------|-----------------------|------------------------------------------------|
| POST   | `/api/analyze`        | Analyze code structure & metrics               |
| POST   | `/api/trace`          | Execute code and return step-by-step trace     |
| POST   | `/api/detect-language`| Detect language of a code snippet              |
| GET    | `/`                   | Health check                                   |

### Example — trace endpoint

```bash
curl -X POST http://localhost:5001/api/trace \
  -H "Content-Type: application/json" \
  -d '{"code": "x = 1\ny = x + 2\nprint(y)", "language": "python"}'
```

---

## 🧰 Tech Stack

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Frontend   | React 18, Vite 5, Tailwind CSS 3             |
| Icons      | React Icons                                  |
| Syntax     | Prism.js                                     |
| Backend    | Node.js, Express 4                           |
| JS Tracer  | acorn (AST parser) + Node.js `vm` module     |
| Python Tracer | `sys.settrace` in a restricted sandbox    |
| CORS       | cors middleware                              |