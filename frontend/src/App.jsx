import { useState, useCallback, useEffect } from 'react';
import './App.css';
import ThemeToggle from './components/ThemeToggle';
import CodeEditor from './components/CodeEditor';
import CodeVisualization from './components/CodeVisualization';
import Stats from './components/Stats';
import { FiCode, FiLoader } from 'react-icons/fi';

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

  // Toggle theme
  const toggleTheme = useCallback(() => setDarkMode((d) => !d), []);

  // Analyze code via backend
  const analyzeCode = useCallback(
    async (codeToAnalyze, lang) => {
      if (!codeToAnalyze.trim()) {
        setAnalysis(null);
        setDetectedLanguage('javascript');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const body = {
          code: codeToAnalyze,
          language: lang === 'auto' ? undefined : lang,
        };

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
        // Still show basic analysis in frontend-only mode
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced analysis on code/language change
  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      analyzeCode(code, language);
    }, DEBOUNCE_MS);
    setDebounceTimer(timer);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language]);

  const displayLanguage = language === 'auto' ? detectedLanguage : language;

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        darkMode ? 'gradient-bg-dark' : 'gradient-bg-light'
      }`}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-20 px-4 py-3 flex items-center justify-between
          ${darkMode ? 'glass-dark' : 'glass-light'}`}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg">
            <FiCode className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1
              className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Code Visualizer
            </h1>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Paste code · Visualize · Analyze
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Detected language badge */}
          {code && (
            <span
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                ${
                  darkMode
                    ? 'bg-purple-900/60 text-purple-300 border border-purple-700'
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                }`}
            >
              {loading && <FiLoader className="w-3 h-3 animate-spin" />}
              {displayLanguage.toUpperCase()}
            </span>
          )}
          <ThemeToggle darkMode={darkMode} onToggle={toggleTheme} />
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="max-w-screen-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats bar */}
        {analysis?.metrics && (
          <Stats metrics={analysis.metrics} darkMode={darkMode} />
        )}

        {/* Error banner */}
        {error && (
          <div
            className={`p-4 rounded-xl text-sm ${
              darkMode
                ? 'bg-red-900/40 border border-red-700 text-red-300'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Two-column editor + visualization */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left: Code Editor */}
          <div
            className={`rounded-2xl p-4 ${darkMode ? 'glass-dark' : 'glass-light'}`}
          >
            <h2
              className={`text-sm font-semibold mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              INPUT — Code Editor
            </h2>
            <CodeEditor
              code={code}
              language={language}
              onCodeChange={setCode}
              onLanguageChange={setLanguage}
              darkMode={darkMode}
            />
          </div>

          {/* Right: Visualization */}
          <div
            className={`rounded-2xl p-4 ${darkMode ? 'glass-dark' : 'glass-light'}`}
          >
            <h2
              className={`text-sm font-semibold mb-3 ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
            >
              OUTPUT — Syntax Highlighted &amp; Structure
              {loading && (
                <FiLoader
                  className={`inline-block ml-2 w-3.5 h-3.5 animate-spin align-middle ${
                    darkMode ? 'text-purple-400' : 'text-purple-600'
                  }`}
                />
              )}
            </h2>
            <CodeVisualization
              code={code}
              language={displayLanguage}
              analysis={analysis}
              darkMode={darkMode}
            />
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer
        className={`mt-8 py-4 text-center text-xs ${
          darkMode ? 'text-gray-600' : 'text-gray-400'
        }`}
      >
        Code Visualizer · Built with React, Vite, Tailwind CSS &amp; Prism.js
      </footer>
    </div>
  );
}
