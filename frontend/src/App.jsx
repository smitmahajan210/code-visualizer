import { useState, useCallback, useEffect } from 'react';
import './App.css';
import ThemeToggle from './components/ThemeToggle';
import CodeEditor from './components/CodeEditor';
import CodeVisualization from './components/CodeVisualization';
import ExecutionVisualizer from './components/ExecutionVisualizer';
import Stats from './components/Stats';
import { FiCode, FiLoader, FiBarChart2, FiChevronDown, FiChevronRight } from 'react-icons/fi';

const API_BASE = '/api';
const DEBOUNCE_MS = 600;

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('auto');
  const [detectedLanguage, setDetectedLanguage] = useState('javascript');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const [structureOpen, setStructureOpen] = useState(false);

  const toggleTheme = useCallback(() => setDarkMode((d) => !d), []);

  const analyzeCode = useCallback(async (codeToAnalyze, lang) => {
    if (!codeToAnalyze.trim()) {
      setAnalysis(null);
      setDetectedLanguage('javascript');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body = { code: codeToAnalyze, language: lang === 'auto' ? undefined : lang };
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setAnalysis(data);
      setDetectedLanguage(data.language || 'javascript');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError('Could not connect to backend. Make sure the server is running on port 5000.');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => analyzeCode(code, language), DEBOUNCE_MS);
    setDebounceTimer(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language]);

  const displayLanguage = language === 'auto' ? detectedLanguage : language;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'gradient-bg-dark' : 'gradient-bg-light'}`}>
      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-20 px-4 py-3 flex items-center justify-between ${darkMode ? 'glass-dark' : 'glass-light'}`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <FiCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Code Visualizer
            </h1>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Write code · Step through execution · Visualize state
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {code && (
            <span className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              darkMode ? 'bg-purple-900/60 text-purple-300 border border-purple-700' : 'bg-purple-100 text-purple-700 border border-purple-200'
            }`}>
              {loading && <FiLoader className="w-3 h-3 animate-spin" />}
              {displayLanguage.toUpperCase()}
            </span>
          )}
          <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 py-4 flex flex-col gap-4">

        {/* Stats bar */}
        {analysis?.metrics && <Stats metrics={analysis.metrics} darkMode={darkMode} />}

        {/* Error banner */}
        {error && (
          <div className={`p-3 rounded-xl text-sm ${darkMode ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Two-column split: Editor (left) | Execution Visualizer (right) ── */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1" style={{ minHeight: '70vh' }}>

          {/* ── LEFT: Code Editor panel ── */}
          <div className={`flex flex-col gap-3 lg:w-5/12 rounded-2xl p-4 ${darkMode ? 'glass-dark' : 'glass-light'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Code Editor
              </span>
              {loading && <FiLoader className={`w-3.5 h-3.5 animate-spin ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />}
            </div>

            <CodeEditor
              code={code}
              language={language}
              displayLanguage={displayLanguage}
              onCodeChange={setCode}
              onLanguageChange={setLanguage}
              darkMode={darkMode}
            />

            {/* Collapsible structure analysis */}
            {(analysis || code) && (
              <div className={`rounded-xl overflow-hidden ${darkMode ? 'border border-gray-700' : 'border border-gray-200'}`}>
                <button
                  onClick={() => setStructureOpen((o) => !o)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold transition-colors
                    ${darkMode ? 'bg-gray-800/60 text-gray-400 hover:text-gray-200' : 'bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                >
                  <FiBarChart2 className="w-3.5 h-3.5" />
                  Structure Analysis
                  <span className="ml-auto">
                    {structureOpen ? <FiChevronDown className="w-3.5 h-3.5" /> : <FiChevronRight className="w-3.5 h-3.5" />}
                  </span>
                </button>
                {structureOpen && (
                  <div className={`p-3 ${darkMode ? 'bg-gray-900/40' : 'bg-white'}`}>
                    <CodeVisualization
                      code={code}
                      language={displayLanguage}
                      analysis={analysis}
                      darkMode={darkMode}
                      showHighlight={false}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Execution Visualizer panel ── */}
          <div className={`flex flex-col lg:flex-1 rounded-2xl p-4 ${darkMode ? 'glass-dark' : 'glass-light'}`}>
            <div className="mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Step-by-Step Execution
              </span>
            </div>
            <ExecutionVisualizer
              code={code}
              language={displayLanguage}
              darkMode={darkMode}
            />
          </div>
        </div>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className={`py-3 text-center text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        Code Visualizer · React + Vite + Tailwind CSS · Python &amp; JavaScript step-by-step execution
      </footer>
    </div>
  );
}
