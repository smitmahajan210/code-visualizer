import { useRef, useCallback, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import { FiUpload, FiClipboard, FiTrash2 } from 'react-icons/fi';

const LANG_MAP = {
  javascript: 'jsx',
  typescript: 'tsx',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  csharp: 'csharp',
  html: 'markup',
  css: 'css',
  sql: 'sql',
  rust: 'rust',
  go: 'go',
  ruby: 'ruby',
  php: 'php',
};

const LANGUAGES = [
  { value: 'auto', label: '🔍 Auto Detect' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'rust', label: 'Rust' },
  { value: 'go', label: 'Go' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
];

export default function CodeEditor({ code, language, displayLanguage, onCodeChange, onLanguageChange, darkMode, currentLine, nextLine }) {
  const fileInputRef = useRef(null);
  const codeRef = useRef(null);
  const highlightRef = useRef(null);
  const textareaRef = useRef(null);
  const activeLineRef = useRef(null);

  const prismLang = LANG_MAP[displayLanguage] || 'javascript';

  // Scroll active line into view when currentLine changes
  useEffect(() => {
    if (currentLine && activeLineRef.current) {
      activeLineRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentLine]);

  // Re-highlight whenever code or language changes
  useEffect(() => {
    if (codeRef.current) {
      codeRef.current.textContent = code;
      try {
        Prism.highlightElement(codeRef.current);
      } catch (err) {
        console.warn('Prism highlight error:', err);
      }
    }
  }, [code, language, prismLang]);

  // Auto-resize textarea so the outer container scroll drives both layers
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;

      // Keep the highlight layer height in sync so it never “runs out” while scrolling.
      if (highlightRef.current) {
        highlightRef.current.style.height = textareaRef.current.style.height;
      }
    }
  }, [code]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onCodeChange(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  }, [onCodeChange]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      onCodeChange(text);
    } catch {
      // Clipboard access denied – user can still type manually
    }
  }, [onCodeChange]);

  const handleClear = useCallback(() => onCodeChange(''), [onCodeChange]);

  const lines = code ? code.split('\n').length : 1;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Language selector */}
        <select
          value={language}
          onChange={(e) => onLanguageChange(e.target.value)}
          className={`
            px-3 py-1.5 rounded-lg text-sm font-medium border outline-none cursor-pointer
            transition-colors duration-150
            ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }
          `}
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>

        {currentLine && (
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 animate-pulse ${
            darkMode ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
          }`}>
            <span>▶</span> Executing Line {currentLine}
          </span>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {/* Paste from clipboard */}
          <button
            onClick={handlePaste}
            title="Paste from clipboard"
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <FiClipboard className="w-4 h-4" />
            <span className="hidden sm:inline">Paste</span>
          </button>

          {/* Upload file */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Upload file"
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${
                darkMode
                  ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <FiUpload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.cs,.html,.css,.sql,.rs,.go,.rb,.php,.txt"
            className="hidden"
            onChange={handleFileUpload}
          />

          {/* Clear */}
          <button
            onClick={handleClear}
            title="Clear code"
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors duration-150
              ${
                darkMode
                  ? 'bg-red-900/50 text-red-300 hover:bg-red-900'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }
            `}
          >
            <FiTrash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Inline highlighted editor */}
      <div
        className={`
          flex rounded-xl overflow-auto font-mono text-sm relative
          ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'}
        `}
        style={{ maxHeight: '65vh' }}
      >
        {/* Line numbers */}
        <div
          aria-hidden="true"
          className={`
            select-none text-right px-2 py-4 min-w-[3.25rem] shrink-0 sticky left-0 z-10
            ${darkMode ? 'text-gray-600 bg-gray-900/90' : 'text-gray-400 bg-gray-50/90'}
          `}
        >
          {Array.from({ length: lines }, (_, i) => {
            const lineNo = i + 1;
            const isActive = lineNo === currentLine;
            const isNext = lineNo === nextLine && !isActive;
            return (
              <div
                key={i}
                ref={isActive ? activeLineRef : null}
                className={`leading-[1.6] text-xs font-mono flex items-center justify-end gap-1 ${
                  isActive
                    ? 'text-yellow-400 font-bold'
                    : isNext
                    ? 'text-blue-400 font-semibold'
                    : darkMode
                    ? 'text-gray-600'
                    : 'text-gray-400'
                }`}
              >
                {isActive && <span className="text-yellow-400 text-[10px] shrink-0">▶</span>}
                <span>{lineNo}</span>
              </div>
            );
          })}
        </div>

        {/* Overlay: highlight layer behind transparent textarea */}
        <div className="relative flex-1 min-w-0">
          {/* Active line background highlight layer */}
          <div className="absolute inset-0 pointer-events-none p-4 font-mono text-sm overflow-hidden" style={{ zIndex: 0 }}>
            {Array.from({ length: lines }, (_, i) => {
              const lineNo = i + 1;
              const isActive = lineNo === currentLine;
              const isNext = lineNo === nextLine && !isActive;
              return (
                <div
                  key={i}
                  className={`leading-[1.6] h-[1.6em] w-full transition-colors duration-150 ${
                    isActive
                      ? darkMode
                        ? 'bg-yellow-500/25 border-l-4 border-yellow-400'
                        : 'bg-yellow-200/80 border-l-4 border-yellow-500'
                      : isNext
                      ? darkMode
                        ? 'bg-blue-500/15 border-l-4 border-blue-500/50'
                        : 'bg-blue-100/70 border-l-4 border-blue-400'
                      : ''
                  }`}
                />
              );
            })}
          </div>

          {/* Syntax-highlighted layer */}
          <pre
            ref={highlightRef}
            aria-hidden="true"
            className={`code-highlight absolute inset-0 m-0 p-4 pointer-events-none overflow-hidden ${
              darkMode ? 'text-gray-200' : 'text-gray-800'
            }`}
            style={{ background: 'transparent', zIndex: 1 }}
          >
            <code
              ref={codeRef}
              className={`language-${prismLang}`}
              style={{ background: 'transparent', fontSize: '0.875rem', lineHeight: '1.6' }}
            />
          </pre>

          {/* Editable textarea — transparent text, visible caret */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="// Paste or type your code here…"
            spellCheck={false}
            className="code-textarea w-full p-4 outline-none bg-transparent editor-textarea"
            style={{
              position: 'relative',
              zIndex: 2,
              color: 'transparent',
              caretColor: darkMode ? '#e5e7eb' : '#111827',
              resize: 'none',
              overflow: 'hidden',
              minHeight: '400px',
              display: 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
}
