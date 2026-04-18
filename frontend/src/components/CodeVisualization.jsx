import { useEffect, useRef, useState, useCallback } from 'react';
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
import {
  FiCopy,
  FiCheck,
  FiChevronDown,
  FiChevronRight,
  FiCode,
  FiBox,
  FiPackage,
  FiList,
} from 'react-icons/fi';

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

// ─── Highlighted code panel ──────────────────────────────────────────────────

function HighlightedCode({ code, language, darkMode }) {
  const codeRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (codeRef.current) {
      try {
        Prism.highlightElement(codeRef.current);
      } catch (err) {
        // Fallback: leave code unhighlighted rather than crash
        console.warn('Prism highlight error:', err);
      }
    }
  }, [code, language]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [code]);

  const prismLang = LANG_MAP[language] || 'javascript';
  const lines = code ? code.split('\n').length : 1;

  return (
    <div
      className={`relative rounded-xl overflow-hidden ${
        darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-50 border border-gray-200'
      }`}
    >
      {/* Copy button */}
      <button
        onClick={handleCopy}
        title="Copy code"
        className={`
          absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5
          rounded-lg text-xs font-medium transition-all duration-150
          ${
            darkMode
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
          }
        `}
      >
        {copied ? (
          <>
            <FiCheck className="w-3.5 h-3.5 text-green-400" />
            Copied!
          </>
        ) : (
          <>
            <FiCopy className="w-3.5 h-3.5" />
            Copy
          </>
        )}
      </button>

      <div className="flex overflow-auto" style={{ maxHeight: '500px' }}>
        {/* Line numbers */}
        <div
          className={`
            select-none text-right px-3 py-4 min-w-[3rem] shrink-0
            ${darkMode ? 'text-gray-600 bg-gray-800/60' : 'text-gray-400 bg-gray-100'}
          `}
        >
          {Array.from({ length: lines }, (_, i) => (
            <div key={i} className="leading-[1.6] text-xs font-mono">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code */}
        <pre
          className={`code-highlight flex-1 p-4 m-0 overflow-x-auto ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}
          style={{ background: 'transparent' }}
        >
          <code
            ref={codeRef}
            className={`language-${prismLang}`}
            style={{ background: 'transparent', fontSize: '0.875rem', lineHeight: '1.6' }}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ─── Collapsible section ─────────────────────────────────────────────────────

function Section({ title, icon: Icon, count, children, darkMode, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  if (count === 0) return null;

  return (
    <div
      className={`rounded-xl overflow-hidden ${
        darkMode ? 'bg-gray-800/60 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'
      }`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left
          ${darkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}
      >
        <span className="flex items-center gap-2 font-semibold text-sm">
          <Icon className="w-4 h-4 text-purple-400" />
          {title}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold
              ${darkMode ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'}`}
          >
            {count}
          </span>
        </span>
        {open ? (
          <FiChevronDown className="w-4 h-4 opacity-50" />
        ) : (
          <FiChevronRight className="w-4 h-4 opacity-50" />
        )}
      </button>

      {open && (
        <div className={`px-4 pb-4 ${darkMode ? 'border-t border-gray-700' : 'border-t border-gray-100'}`}>
          <div className="mt-3 space-y-2">{children}</div>
        </div>
      )}
    </div>
  );
}

// ─── Structure chips ─────────────────────────────────────────────────────────

function FunctionItem({ fn, darkMode }) {
  return (
    <div
      className={`flex items-start gap-2 p-2 rounded-lg text-sm
        ${darkMode ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}
    >
      <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-blue-500/20 text-blue-400">
        fn
      </span>
      <div>
        <span className="font-mono font-semibold">{fn.name}</span>
        {fn.params !== undefined && (
          <span className={`text-xs ml-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            ({fn.params || ''})
          </span>
        )}
        {fn.type && fn.type !== 'function' && (
          <span
            className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
              darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {fn.type}
          </span>
        )}
      </div>
    </div>
  );
}

function ClassItem({ cls, darkMode }) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg text-sm
        ${darkMode ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}
    >
      <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-green-500/20 text-green-400">
        cls
      </span>
      <span className="font-mono font-semibold">{cls.name}</span>
      {cls.extends && (
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          extends <span className="font-semibold">{cls.extends}</span>
        </span>
      )}
    </div>
  );
}

function VariableItem({ variable, darkMode }) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg text-sm
        ${darkMode ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}
    >
      <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-yellow-500/20 text-yellow-400">
        var
      </span>
      <span className="font-mono">{variable.name}</span>
      {variable.kind && (
        <span className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{variable.kind}</span>
      )}
    </div>
  );
}

// ─── HTML-specific sections ───────────────────────────────────────────────────

function HtmlStructure({ structure, darkMode }) {
  const { htmlTags = [], htmlIds = [], htmlClasses = [] } = structure;
  return (
    <div className="space-y-3">
      {htmlTags.length > 0 && (
        <Section title="HTML Tags" icon={FiCode} count={htmlTags.length} darkMode={darkMode}>
          <div className="flex flex-wrap gap-2">
            {htmlTags.map((t) => (
              <span
                key={t.name}
                className={`px-2 py-1 rounded text-xs font-mono
                  ${darkMode ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-700'}`}
              >
                &lt;{t.name}&gt; ×{t.count}
              </span>
            ))}
          </div>
        </Section>
      )}
      {htmlIds.length > 0 && (
        <Section title="IDs" icon={FiList} count={htmlIds.length} darkMode={darkMode}>
          <div className="flex flex-wrap gap-2">
            {htmlIds.map((id) => (
              <span
                key={id}
                className={`px-2 py-1 rounded text-xs font-mono
                  ${darkMode ? 'bg-gray-700 text-green-300' : 'bg-green-50 text-green-700'}`}
              >
                #{id}
              </span>
            ))}
          </div>
        </Section>
      )}
      {htmlClasses.length > 0 && (
        <Section title="Classes" icon={FiBox} count={htmlClasses.length} darkMode={darkMode}>
          <div className="flex flex-wrap gap-2">
            {htmlClasses.map((c) => (
              <span
                key={c}
                className={`px-2 py-1 rounded text-xs font-mono
                  ${darkMode ? 'bg-gray-700 text-purple-300' : 'bg-purple-50 text-purple-700'}`}
              >
                .{c}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── CSS-specific sections ────────────────────────────────────────────────────

function CssStructure({ structure, darkMode }) {
  const { cssSelectors = [], cssProperties = [] } = structure;
  return (
    <div className="space-y-3">
      {cssSelectors.length > 0 && (
        <Section title="Selectors" icon={FiCode} count={cssSelectors.length} darkMode={darkMode}>
          <div className="flex flex-wrap gap-2">
            {cssSelectors.map((s, i) => (
              <span
                key={i}
                className={`px-2 py-1 rounded text-xs font-mono
                  ${darkMode ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-700'}`}
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      )}
      {cssProperties.length > 0 && (
        <Section title="Properties" icon={FiList} count={cssProperties.length} darkMode={darkMode}>
          <div className="flex flex-wrap gap-2">
            {cssProperties.map((p) => (
              <span
                key={p.name}
                className={`px-2 py-1 rounded text-xs font-mono
                  ${darkMode ? 'bg-gray-700 text-green-300' : 'bg-green-50 text-green-700'}`}
              >
                {p.name} ×{p.count}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── SQL-specific sections ────────────────────────────────────────────────────

function SqlStructure({ structure, darkMode }) {
  const { sqlTables = [], sqlQueryTypes = [] } = structure;
  return (
    <div className="space-y-3">
      {sqlTables.length > 0 && (
        <Section title="Tables" icon={FiBox} count={sqlTables.length} darkMode={darkMode}>
          <div className="flex flex-wrap gap-2">
            {sqlTables.map((t) => (
              <span
                key={t}
                className={`px-2 py-1 rounded text-xs font-mono
                  ${darkMode ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-700'}`}
              >
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}
      {sqlQueryTypes.length > 0 && (
        <Section title="Query Types" icon={FiList} count={sqlQueryTypes.length} darkMode={darkMode}>
          <div className="flex flex-wrap gap-2">
            {sqlQueryTypes.map((q) => (
              <span
                key={q.type}
                className={`px-2 py-1 rounded text-xs font-mono font-bold
                  ${darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}
              >
                {q.type} ×{q.count}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Main Visualization component ────────────────────────────────────────────

export default function CodeVisualization({ code, language, analysis, darkMode, showHighlight = true }) {
  if (!code) {
    return (
      <div
        className={`flex items-center justify-center h-64 rounded-xl border-2 border-dashed text-center p-8
          ${darkMode ? 'border-gray-700 text-gray-600' : 'border-gray-300 text-gray-400'}`}
      >
        <div>
          <FiCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No code to visualize</p>
          <p className="text-sm mt-1">Paste or type your code in the editor above</p>
        </div>
      </div>
    );
  }

  const structure = analysis?.structure || {};
  const { functions = [], classes = [], variables = [], imports = [] } = structure;

  return (
    <div className="space-y-4">
      {/* Syntax highlighted code (hidden when inline highlighting is active in the editor) */}
      {showHighlight && <HighlightedCode code={code} language={language} darkMode={darkMode} />}

      {/* Structure sections */}
      {language === 'html' && <HtmlStructure structure={structure} darkMode={darkMode} />}
      {language === 'css' && <CssStructure structure={structure} darkMode={darkMode} />}
      {language === 'sql' && <SqlStructure structure={structure} darkMode={darkMode} />}

      {language !== 'html' && language !== 'css' && language !== 'sql' && (
        <div className="space-y-3">
          <Section
            title="Functions & Methods"
            icon={FiCode}
            count={functions.length}
            darkMode={darkMode}
          >
            {functions.map((fn, i) => (
              <FunctionItem key={i} fn={fn} darkMode={darkMode} />
            ))}
          </Section>

          <Section title="Classes" icon={FiBox} count={classes.length} darkMode={darkMode}>
            {classes.map((cls, i) => (
              <ClassItem key={i} cls={cls} darkMode={darkMode} />
            ))}
          </Section>

          <Section
            title="Variables"
            icon={FiList}
            count={variables.length}
            darkMode={darkMode}
            defaultOpen={false}
          >
            {variables.map((v, i) => (
              <VariableItem key={i} variable={v} darkMode={darkMode} />
            ))}
          </Section>

          <Section
            title="Imports / Dependencies"
            icon={FiPackage}
            count={imports.length}
            darkMode={darkMode}
            defaultOpen={false}
          >
            <div className="flex flex-wrap gap-2">
              {imports.map((imp, i) => (
                <span
                  key={i}
                  className={`px-2 py-1 rounded text-xs font-mono
                    ${darkMode ? 'bg-gray-700 text-blue-300' : 'bg-blue-50 text-blue-700'}`}
                >
                  {imp}
                </span>
              ))}
            </div>
          </Section>
        </div>
      )}

      {/* TypeScript extras */}
      {language === 'typescript' && structure.interfaces && structure.interfaces.length > 0 && (
        <Section
          title="Interfaces"
          icon={FiCode}
          count={structure.interfaces.length}
          darkMode={darkMode}
        >
          {structure.interfaces.map((iface, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 p-2 rounded-lg text-sm
                ${darkMode ? 'bg-gray-900/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}
            >
              <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400">
                if
              </span>
              <span className="font-mono">{iface.name}</span>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}
