import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiPlay,
  FiPause,
  FiSkipBack,
  FiSkipForward,
  FiChevronLeft,
  FiChevronRight,
  FiLoader,
  FiAlertTriangle,
  FiTerminal,
  FiLayers,
  FiCode,
} from 'react-icons/fi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Render a traced value (the safe_repr dict) as a readable string/chip. */
function renderValue(val) {
  if (!val) return 'undefined';
  const { type, value } = val;
  if (type === 'NoneType' || type === 'null') return 'None / null';
  if (type === 'undefined') return 'undefined';
  if (type === 'str' || type === 'string') return `"${value}"`;
  if (type === 'list' || type === 'Array') {
    if (!Array.isArray(value)) return '[]';
    return `[${value.map(renderValue).join(', ')}]`;
  }
  if (type === 'tuple') {
    if (!Array.isArray(value)) return '()';
    return `(${value.map(renderValue).join(', ')})`;
  }
  if (type === 'set') {
    if (!Array.isArray(value)) return 'set()';
    return `{${value.map(renderValue).join(', ')}}`;
  }
  if (type === 'dict' || type === 'Object') {
    if (typeof value !== 'object' || value === null) return '{}';
    const entries = Object.entries(value)
      .map(([k, v]) => `${k}: ${renderValue(v)}`)
      .join(', ');
    return `{${entries}}`;
  }
  if (type === 'function') return String(value);
  return String(value);
}

function typeColor(type) {
  switch (type) {
    case 'int':
    case 'float':
    case 'number':
      return 'text-blue-400';
    case 'str':
    case 'string':
      return 'text-green-400';
    case 'bool':
    case 'boolean':
      return 'text-yellow-400';
    case 'list':
    case 'Array':
    case 'tuple':
      return 'text-orange-400';
    case 'dict':
    case 'Object':
    case 'set':
      return 'text-pink-400';
    case 'function':
      return 'text-purple-400';
    default:
      return 'text-gray-400';
  }
}

// ─── Memory Panel ──────────────────────────────────────────────────────────────

function VariableRow({ name, val, darkMode }) {
  const repr = renderValue(val);
  const color = typeColor(val?.type);
  return (
    <div
      className={`flex items-start gap-2 py-1.5 px-2 rounded text-xs font-mono
        ${darkMode ? 'hover:bg-gray-700/40' : 'hover:bg-gray-100'}`}
    >
      <span className={`shrink-0 font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
        {name}
      </span>
      <span className={`shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>=</span>
      <span className={`break-all ${color}`}>{repr}</span>
      <span className={`ml-auto shrink-0 text-[10px] px-1 rounded ${darkMode ? 'bg-gray-700 text-gray-500' : 'bg-gray-200 text-gray-500'}`}>
        {val?.type}
      </span>
    </div>
  );
}

function FrameCard({ frame, darkMode, isActive }) {
  const vars = Object.entries(frame.locals || {});
  return (
    <div
      className={`rounded-lg border overflow-hidden mb-2
        ${isActive
          ? darkMode
            ? 'border-purple-500 bg-purple-900/20'
            : 'border-purple-400 bg-purple-50'
          : darkMode
            ? 'border-gray-700 bg-gray-800/50'
            : 'border-gray-200 bg-white'
        }`}
    >
      <div
        className={`px-3 py-1.5 flex items-center gap-2 text-xs font-semibold
          ${isActive
            ? darkMode ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'
            : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
          }`}
      >
        <FiLayers className="w-3.5 h-3.5 shrink-0" />
        {frame.funcName}
        <span className={`ml-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          line {frame.line}
        </span>
      </div>
      <div className="px-2 py-1">
        {vars.length === 0 ? (
          <p className={`text-xs italic px-1 py-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            (no variables)
          </p>
        ) : (
          vars.map(([k, v]) => (
            <VariableRow key={k} name={k} val={v} darkMode={darkMode} />
          ))
        )}
      </div>
    </div>
  );
}

function MemoryPanel({ step, darkMode }) {
  if (!step) {
    return (
      <div className={`flex items-center justify-center h-full text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        Run code to see variable state
      </div>
    );
  }

  const frames = step.callStack || [];

  return (
    <div className="space-y-1 overflow-auto h-full pr-1">
      <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Call Stack &amp; Variables
      </p>
      {frames.length === 0 ? (
        <p className={`text-xs italic ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
          Empty call stack
        </p>
      ) : (
        frames.map((frame, i) => (
          <FrameCard
            key={i}
            frame={frame}
            darkMode={darkMode}
            isActive={i === frames.length - 1}
          />
        ))
      )}
    </div>
  );
}

// ─── Code Panel with line highlight ──────────────────────────────────────────

function CodePanel({ code, currentLine, darkMode }) {
  const lines = code.split('\n');
  const activeRef = useRef(null);

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [currentLine]);

  return (
    <div
      className={`rounded-xl overflow-hidden border font-mono text-sm
        ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
    >
      <div className="overflow-auto" style={{ maxHeight: '380px' }}>
        {lines.map((line, idx) => {
          const lineNo = idx + 1;
          const isActive = lineNo === currentLine;
          return (
            <div
              key={idx}
              ref={isActive ? activeRef : null}
              className={`flex items-start leading-6 transition-colors duration-100
                ${isActive
                  ? darkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'
                  : darkMode ? 'hover:bg-gray-800/40' : 'hover:bg-gray-100'
                }`}
            >
              {/* Arrow indicator */}
              <span
                className={`w-5 shrink-0 text-center select-none
                  ${isActive ? 'text-yellow-400' : 'text-transparent'}`}
              >
                ▶
              </span>
              {/* Line number */}
              <span
                className={`w-8 shrink-0 select-none text-right pr-3 text-xs
                  ${isActive
                    ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                    : darkMode ? 'text-gray-600' : 'text-gray-400'
                  }`}
              >
                {lineNo}
              </span>
              {/* Code */}
              <span
                className={`flex-1 pl-1 pr-4 whitespace-pre
                  ${isActive
                    ? darkMode ? 'text-yellow-100' : 'text-yellow-900'
                    : darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
              >
                {line || ' '}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step controls ─────────────────────────────────────────────────────────────

function StepControls({ stepIndex, totalSteps, onFirst, onBack, onForward, onLast, onPlay, playing, darkMode }) {
  const btnBase = `flex items-center justify-center rounded-lg transition-colors disabled:opacity-30
    ${darkMode
      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:hover:bg-gray-700'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:hover:bg-gray-200'
    }`;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button className={`${btnBase} p-2`} onClick={onFirst} disabled={stepIndex <= 0} title="First step">
        <FiSkipBack className="w-4 h-4" />
      </button>
      <button className={`${btnBase} p-2`} onClick={onBack} disabled={stepIndex <= 0} title="Previous step">
        <FiChevronLeft className="w-4 h-4" />
      </button>

      <button
        className={`${btnBase} px-3 py-2 gap-1.5 text-sm font-medium
          ${playing
            ? darkMode ? '!bg-yellow-600 text-white hover:!bg-yellow-500' : '!bg-yellow-400 text-white hover:!bg-yellow-300'
            : darkMode ? '!bg-purple-600 text-white hover:!bg-purple-500' : '!bg-purple-500 text-white hover:!bg-purple-400'
          }`}
        onClick={onPlay}
        disabled={totalSteps === 0}
      >
        {playing ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
        {playing ? 'Pause' : 'Play'}
      </button>

      <button className={`${btnBase} p-2`} onClick={onForward} disabled={stepIndex >= totalSteps - 1} title="Next step">
        <FiChevronRight className="w-4 h-4" />
      </button>
      <button className={`${btnBase} p-2`} onClick={onLast} disabled={stepIndex >= totalSteps - 1} title="Last step">
        <FiSkipForward className="w-4 h-4" />
      </button>

      <span className={`text-xs ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        {totalSteps > 0 ? `Step ${stepIndex + 1} of ${totalSteps}` : 'No steps'}
      </span>
    </div>
  );
}

// ─── Output Panel ─────────────────────────────────────────────────────────────

function OutputPanel({ stdout, darkMode }) {
  return (
    <div
      className={`rounded-xl border overflow-hidden
        ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}
    >
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b
          ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-600'}`}
      >
        <FiTerminal className="w-3.5 h-3.5" />
        Output
      </div>
      <pre
        className={`px-3 py-2 text-xs font-mono overflow-auto whitespace-pre-wrap
          ${darkMode ? 'text-green-400' : 'text-green-700'}`}
        style={{ minHeight: '3rem', maxHeight: '8rem' }}
      >
        {stdout || <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>(no output yet)</span>}
      </pre>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const PLAY_INTERVAL_MS = 700;

export default function ExecutionVisualizer({ code, language, darkMode }) {
  const [traceResult, setTraceResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef(null);

  // Run / re-run trace whenever code or language changes
  const runTrace = useCallback(async () => {
    if (!code?.trim()) {
      setTraceResult(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setStepIndex(0);
    setPlaying(false);
    clearInterval(playTimer.current);
    try {
      const res = await fetch('/api/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Trace failed');
      setTraceResult(data);
    } catch (err) {
      setError(err.message);
      setTraceResult(null);
    } finally {
      setLoading(false);
    }
  }, [code, language]);

  // Auto-play
  useEffect(() => {
    if (playing && traceResult) {
      playTimer.current = setInterval(() => {
        setStepIndex((idx) => {
          const next = idx + 1;
          if (next >= traceResult.steps.length) {
            setPlaying(false);
            clearInterval(playTimer.current);
            return idx;
          }
          return next;
        });
      }, PLAY_INTERVAL_MS);
    } else {
      clearInterval(playTimer.current);
    }
    return () => clearInterval(playTimer.current);
  }, [playing, traceResult]);

  const steps = traceResult?.steps || [];
  const currentStep = steps[stepIndex] || null;
  const currentLine = currentStep?.line ?? null;

  if (!code?.trim()) {
    return (
      <div
        className={`flex items-center justify-center h-64 rounded-xl border-2 border-dashed text-center p-8
          ${darkMode ? 'border-gray-700 text-gray-600' : 'border-gray-300 text-gray-400'}`}
      >
        <div>
          <FiCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No code to execute</p>
          <p className="text-sm mt-1">Paste Python or JavaScript code in the editor above, then click Run</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Run button */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={runTrace}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors
            ${darkMode
              ? 'bg-purple-600 text-white hover:bg-purple-500 disabled:bg-purple-900 disabled:text-purple-700'
              : 'bg-purple-600 text-white hover:bg-purple-500 disabled:bg-purple-200 disabled:text-purple-400'
            }`}
        >
          {loading ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiPlay className="w-4 h-4" />}
          {loading ? 'Running…' : 'Run & Trace'}
        </button>

        {traceResult?.truncated && (
          <span className={`text-xs px-2 py-1 rounded font-medium
            ${darkMode ? 'bg-yellow-900/40 text-yellow-400 border border-yellow-700' : 'bg-yellow-50 text-yellow-700 border border-yellow-300'}`}>
            ⚠ Trace truncated at 500 steps
          </span>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div
          className={`flex items-start gap-2 p-3 rounded-xl text-sm
            ${darkMode ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}
        >
          <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Runtime error from user code */}
      {traceResult?.error && (
        <div
          className={`p-3 rounded-xl text-xs font-mono overflow-auto
            ${darkMode ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}
          style={{ maxHeight: '120px' }}
        >
          <strong>Runtime error:</strong>
          <pre className="mt-1 whitespace-pre-wrap">{traceResult.error}</pre>
        </div>
      )}

      {/* Main visualizer: code + memory side by side */}
      {traceResult && steps.length > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Code panel */}
            <div className="space-y-2">
              <p className={`text-xs font-bold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Code Execution
              </p>
              <CodePanel code={code} currentLine={currentLine} darkMode={darkMode} />
            </div>

            {/* Right: Memory / Variables */}
            <div
              className={`rounded-xl border p-3 overflow-auto ${darkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'}`}
              style={{ minHeight: '200px', maxHeight: '380px' }}
            >
              <MemoryPanel step={currentStep} darkMode={darkMode} />
            </div>
          </div>

          {/* Step controls */}
          <StepControls
            stepIndex={stepIndex}
            totalSteps={steps.length}
            onFirst={() => { setPlaying(false); setStepIndex(0); }}
            onBack={() => { setPlaying(false); setStepIndex((i) => Math.max(0, i - 1)); }}
            onForward={() => { setPlaying(false); setStepIndex((i) => Math.min(steps.length - 1, i + 1)); }}
            onLast={() => { setPlaying(false); setStepIndex(steps.length - 1); }}
            onPlay={() => {
              if (playing) {
                setPlaying(false);
              } else {
                if (stepIndex >= steps.length - 1) setStepIndex(0);
                setPlaying(true);
              }
            }}
            playing={playing}
            darkMode={darkMode}
          />

          {/* Output */}
          <OutputPanel stdout={currentStep?.stdout || ''} darkMode={darkMode} />
        </>
      )}

      {traceResult && steps.length === 0 && (
        <p className={`text-sm italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No execution steps captured. The code may have produced no statements.
        </p>
      )}
    </div>
  );
}
