import { useRef, useCallback } from 'react';
import { FiUpload, FiClipboard, FiTrash2 } from 'react-icons/fi';

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

export default function CodeEditor({ code, language, onCodeChange, onLanguageChange, darkMode }) {
  const fileInputRef = useRef(null);

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

  return (
    <div className="flex flex-col gap-3 h-full">
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

      {/* Textarea with line numbers */}
      <div
        className={`
          relative flex flex-1 rounded-xl overflow-hidden font-mono text-sm
          ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'}
        `}
      >
        {/* Line numbers */}
        <LineNumbers code={code} darkMode={darkMode} />

        {/* Code textarea */}
        <textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="// Paste or type your code here…"
          spellCheck={false}
          className={`
            code-textarea flex-1 p-4 outline-none bg-transparent
            ${darkMode ? 'text-gray-100 placeholder-gray-600' : 'text-gray-800 placeholder-gray-400'}
          `}
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
}

function LineNumbers({ code, darkMode }) {
  const lines = code ? code.split('\n').length : 1;
  return (
    <div
      className={`
        select-none text-right px-3 py-4 min-w-[3rem]
        ${darkMode ? 'text-gray-600 bg-gray-800/60' : 'text-gray-400 bg-gray-100'}
      `}
    >
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="leading-[1.6] text-xs">
          {i + 1}
        </div>
      ))}
    </div>
  );
}
