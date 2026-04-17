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
  FiRotateCcw,
  FiZap,
} from 'react-icons/fi';

// Speed label thresholds (ms)
const SPEED_FAST_THRESHOLD = 300;
const SPEED_MED_THRESHOLD = 900;

// ─── Value renderer ────────────────────────────────────────────────────────────

function renderValue(val) {
  if (!val) return 'undefined';
  const { type, value } = val;
  if (type === 'NoneType' || type === 'null') return 'None';
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
    case 'int': case 'float': case 'number': return 'text-blue-400';
    case 'str': case 'string': return 'text-green-400';
    case 'bool': case 'boolean': return 'text-yellow-400';
    case 'list': case 'Array': case 'tuple': return 'text-orange-400';
    case 'dict': case 'Object': case 'set': return 'text-pink-400';
    case 'function': return 'text-purple-400';
    default: return 'text-gray-400';
  }
}

function typeBadgeColor(type, darkMode) {
  switch (type) {
    case 'int': case 'float': case 'number':
      return darkMode ? 'bg-blue-900/50 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200';
    case 'str': case 'string':
      return darkMode ? 'bg-green-900/50 text-green-300 border-green-700' : 'bg-green-50 text-green-700 border-green-200';
    case 'bool': case 'boolean':
      return darkMode ? 'bg-yellow-900/50 text-yellow-300 border-yellow-700' : 'bg-yellow-50 text-yellow-700 border-yellow-200';
    case 'list': case 'Array': case 'tuple':
      return darkMode ? 'bg-orange-900/50 text-orange-300 border-orange-700' : 'bg-orange-50 text-orange-700 border-orange-200';
    case 'dict': case 'Object': case 'set':
      return darkMode ? 'bg-pink-900/50 text-pink-300 border-pink-700' : 'bg-pink-50 text-pink-700 border-pink-200';
    case 'function':
      return darkMode ? 'bg-purple-900/50 text-purple-300 border-purple-700' : 'bg-purple-50 text-purple-700 border-purple-200';
    default:
      return darkMode ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-200';
  }
}

// ─── Pointer detection helpers ─────────────────────────────────────────────────

const POINTER_CONFIG = [
  { names: ['left', 'l', 'lo', 'low', 'start', 'begin', 'i'], label: 'L', color: '#f59e0b', bg: '#78350f' },
  { names: ['right', 'r', 'hi', 'high', 'end', 'j'], label: 'R', color: '#10b981', bg: '#064e3b' },
  { names: ['mid', 'm', 'middle', 'k'], label: 'M', color: '#8b5cf6', bg: '#3b0764' },
  { names: ['p', 'ptr', 'curr', 'cur', 'current'], label: 'P', color: '#ef4444', bg: '#7f1d1d' },
];

function detectPointers(locals) {
  const pointers = {};
  for (const config of POINTER_CONFIG) {
    for (const name of config.names) {
      if (name in locals) {
        const val = locals[name];
        if (val && (val.type === 'int' || val.type === 'number') && typeof val.value === 'number') {
          pointers[name] = { ...config, index: val.value };
          break;
        }
      }
    }
  }
  return pointers;
}

// ─── Array Visualizer ──────────────────────────────────────────────────────────

function ArrayVisualizer({ name, val, pointers, darkMode }) {
  const items = val.value || [];
  if (!Array.isArray(items) || items.length === 0) return null;

  // Build pointer→index map for this array
  const pointerAtIndex = {};
  for (const [_key, ptr] of Object.entries(pointers)) {
    if (ptr.index >= 0 && ptr.index < items.length) {
      if (!pointerAtIndex[ptr.index]) pointerAtIndex[ptr.index] = [];
      pointerAtIndex[ptr.index].push(ptr);
    }
  }

  return (
    <div className="mb-4">
      <div className={`text-xs font-mono font-semibold mb-1.5 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        {name}
        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${typeBadgeColor(val.type, darkMode)}`}>
          {val.type}[{items.length}]
        </span>
      </div>

      {/* Pointer labels row */}
      {Object.keys(pointerAtIndex).length > 0 && (
        <div className="flex mb-0.5" style={{ overflowX: 'auto' }}>
          {items.map((_, idx) => (
            <div key={idx} className="flex flex-col items-center" style={{ minWidth: '2.75rem', width: '2.75rem' }}>
              {(pointerAtIndex[idx] || []).map((ptr, pi) => (
                <div key={pi} className="flex flex-col items-center">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: ptr.color, background: `${ptr.bg}99`, border: `1px solid ${ptr.color}55` }}
                  >
                    {ptr.label}
                  </span>
                  <span style={{ color: ptr.color, lineHeight: 1 }}>▼</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Array cells */}
      <div className="flex" style={{ overflowX: 'auto' }}>
        {items.map((item, idx) => {
          const ptrs = pointerAtIndex[idx] || [];
          const isPointed = ptrs.length > 0;
          const primaryPtr = ptrs[0];
          return (
            <div
              key={idx}
              className="array-cell flex flex-col items-center"
              style={{ minWidth: '2.75rem', width: '2.75rem' }}
            >
              <div
                className={`array-box w-10 h-10 flex items-center justify-center text-xs font-mono font-bold border-2 rounded transition-all duration-200
                  ${isPointed ? 'scale-110' : ''}`}
                style={
                  isPointed
                    ? {
                        borderColor: primaryPtr.color,
                        color: primaryPtr.color,
                        background: `${primaryPtr.bg}44`,
                        boxShadow: `0 0 8px ${primaryPtr.color}66`,
                      }
                    : darkMode
                    ? { borderColor: '#4b5563', color: '#d1d5db', background: '#1f2937' }
                    : { borderColor: '#d1d5db', color: '#374151', background: '#f9fafb' }
                }
              >
                {renderValue(item)}
              </div>
              <span className={`text-[9px] mt-0.5 font-mono ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                {idx}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Variable Row ─────────────────────────────────────────────────────────────

function VariableRow({ name, val, darkMode }) {
  const repr = renderValue(val);
  const color = typeColor(val?.type);
  return (
    <div className={`flex items-center gap-2 py-1.5 px-2 rounded-lg text-xs font-mono transition-colors
      ${darkMode ? 'hover:bg-gray-700/40 bg-gray-800/30' : 'hover:bg-gray-100 bg-gray-50'} mb-1`}>
      <span className={`shrink-0 font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{name}</span>
      <span className={`shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>=</span>
      <span className={`break-all ${color}`}>{repr}</span>
      <span className={`ml-auto shrink-0 text-[10px] px-1.5 py-0.5 rounded border ${typeBadgeColor(val?.type, darkMode)}`}>
        {val?.type}
      </span>
    </div>
  );
}

// ─── Frame Card ───────────────────────────────────────────────────────────────

function FrameCard({ frame, darkMode, isActive }) {
  const entries = Object.entries(frame.locals || {});
  const arrays = entries.filter(([, v]) =>
    v && (v.type === 'list' || v.type === 'Array' || v.type === 'tuple') && Array.isArray(v.value) && v.value.length > 0
  );
  const scalars = entries.filter(([, v]) =>
    !v || !(v.type === 'list' || v.type === 'Array' || v.type === 'tuple') || !Array.isArray(v.value)
  );

  // Detect pointers from scalar variables
  const pointers = detectPointers(frame.locals || {});

  return (
    <div className={`rounded-xl border overflow-hidden mb-3 transition-all duration-200
      ${isActive
        ? darkMode ? 'border-purple-500 bg-purple-900/10 shadow-lg shadow-purple-900/20' : 'border-purple-400 bg-purple-50'
        : darkMode ? 'border-gray-700 bg-gray-800/40' : 'border-gray-200 bg-white'
      }`}>
      {/* Frame header */}
      <div className={`px-3 py-2 flex items-center gap-2 text-xs font-semibold
        ${isActive
          ? darkMode ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
          : darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
        }`}>
        <FiLayers className="w-3.5 h-3.5 shrink-0" />
        <span className="font-mono">{frame.funcName}</span>
        {isActive && (
          <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${darkMode ? 'bg-purple-700/50 text-purple-200' : 'bg-purple-200 text-purple-800'}`}>
            active
          </span>
        )}
        <span className={`ml-auto ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          line {frame.line}
        </span>
      </div>

      <div className="px-3 py-2">
        {/* Array visualizations */}
        {arrays.length > 0 && (
          <div className="mb-2">
            {arrays.map(([k, v]) => (
              <ArrayVisualizer key={k} name={k} val={v} pointers={pointers} darkMode={darkMode} />
            ))}
          </div>
        )}

        {/* Scalar variables */}
        {scalars.length === 0 && arrays.length === 0 ? (
          <p className={`text-xs italic py-1 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            (no variables)
          </p>
        ) : (
          scalars.map(([k, v]) => (
            <VariableRow key={k} name={k} val={v} darkMode={darkMode} />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Memory Panel ─────────────────────────────────────────────────────────────

function MemoryPanel({ step, darkMode }) {
  if (!step) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
        <FiLayers className="w-10 h-10 opacity-30" />
        <p className="text-sm text-center">Run code to see variable state</p>
      </div>
    );
  }

  const frames = step.callStack || [];
  const eventColors = {
    call: darkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200',
    return: darkMode ? 'bg-green-900/30 text-green-300 border-green-700' : 'bg-green-50 text-green-700 border-green-200',
    exception: darkMode ? 'bg-red-900/30 text-red-300 border-red-700' : 'bg-red-50 text-red-700 border-red-200',
    line: darkMode ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' : 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };
  const eventLabels = { call: '📞 Function call', return: '↩ Return', exception: '⚠ Exception', line: '→ Executing' };

  return (
    <div className="h-full overflow-auto pr-1 space-y-2">
      {/* Event badge */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Call Stack &amp; Variables
        </span>
        {step.event && (
          <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full border font-semibold ${eventColors[step.event] || eventColors.line}`}>
            {eventLabels[step.event] || step.event}
          </span>
        )}
      </div>

      {/* Return value */}
      {step.returnValue && step.event === 'return' && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono border
          ${darkMode ? 'bg-green-900/20 border-green-700 text-green-300' : 'bg-green-50 border-green-200 text-green-700'}`}>
          <span className="font-bold">return</span>
          <span className={typeColor(step.returnValue?.type)}>{renderValue(step.returnValue)}</span>
        </div>
      )}

      {/* Exception message */}
      {step.exceptionMsg && (
        <div className={`px-3 py-2 rounded-lg text-xs font-mono border
          ${darkMode ? 'bg-red-900/20 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <span className="font-bold">⚠ Exception: </span>{step.exceptionMsg}
        </div>
      )}

      {/* Call stack frames */}
      {frames.length === 0 ? (
        <p className={`text-xs italic ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>Empty call stack</p>
      ) : (
        frames.map((frame, i) => (
          <FrameCard key={i} frame={frame} darkMode={darkMode} isActive={i === frames.length - 1} />
        ))
      )}
    </div>
  );
}

// ─── Code Panel ───────────────────────────────────────────────────────────────

function CodePanel({ code, currentLine, nextLine, darkMode }) {
  const lines = code.split('\n');
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentLine]);

  return (
    <div className={`rounded-xl overflow-hidden border font-mono text-sm
      ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className={`flex items-center gap-2 px-3 py-1.5 border-b text-xs font-semibold
        ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>
        <FiCode className="w-3.5 h-3.5" />
        Code Execution
        {currentLine && (
          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold
            ${darkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'}`}>
            Line {currentLine}
          </span>
        )}
      </div>
      <div className="overflow-auto" style={{ maxHeight: '320px' }}>
        {lines.map((line, idx) => {
          const lineNo = idx + 1;
          const isActive = lineNo === currentLine;
          const isNext = lineNo === nextLine && !isActive;
          return (
            <div
              key={idx}
              ref={isActive ? activeRef : null}
              className={`flex items-start leading-6 transition-colors duration-150
                ${isActive
                  ? darkMode ? 'bg-yellow-500/20 border-l-2 border-yellow-400' : 'bg-yellow-100 border-l-2 border-yellow-500'
                  : isNext
                  ? darkMode ? 'bg-blue-500/10 border-l-2 border-blue-600/40' : 'bg-blue-50 border-l-2 border-blue-300/50'
                  : darkMode ? 'hover:bg-gray-800/40 border-l-2 border-transparent' : 'hover:bg-gray-100 border-l-2 border-transparent'
                }`}
            >
              {/* Arrow indicator */}
              <span className={`w-5 shrink-0 text-center select-none text-xs
                ${isActive ? 'text-yellow-400' : 'text-transparent'}`}>▶</span>
              {/* Line number */}
              <span className={`w-8 shrink-0 select-none text-right pr-3 text-xs
                ${isActive ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
                  : darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                {lineNo}
              </span>
              {/* Code text */}
              <span className={`flex-1 pl-1 pr-4 whitespace-pre
                ${isActive
                  ? darkMode ? 'text-yellow-100' : 'text-yellow-900'
                  : isNext
                  ? darkMode ? 'text-blue-300/70' : 'text-blue-800/60'
                  : darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                {line || ' '}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step Controls ────────────────────────────────────────────────────────────

function StepControls({ stepIndex, totalSteps, onFirst, onBack, onForward, onLast, onPlay, onReset, playing, darkMode, speed, onSpeedChange }) {
  const btnBase = `flex items-center justify-center rounded-lg transition-colors disabled:opacity-30
    ${darkMode
      ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:hover:bg-gray-700'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:hover:bg-gray-200'
    }`;

  const pct = Math.round(((stepIndex + 1) / Math.max(totalSteps, 1)) * 100);

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {totalSteps > 0 && (
        <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Buttons */}
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

        <button className={`${btnBase} p-2`} onClick={onReset} title="Reset">
          <FiRotateCcw className="w-4 h-4" />
        </button>

        <span className={`text-xs ml-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {totalSteps > 0 ? `${stepIndex + 1} of ${totalSteps}` : '—'}
        </span>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-3">
        <FiZap className={`w-3.5 h-3.5 shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
        <span className={`text-xs shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Speed</span>
        <input
          type="range"
          min={100}
          max={2000}
          step={100}
          value={2100 - speed}
          onChange={(e) => onSpeedChange(2100 - Number(e.target.value))}
          className="flex-1 h-1.5 rounded-full accent-purple-500 cursor-pointer"
          style={{ accentColor: '#8b5cf6' }}
          title={`${speed}ms per step`}
        />
        <span className={`text-xs shrink-0 w-12 text-right font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          {speed < SPEED_FAST_THRESHOLD ? 'Fast' : speed < SPEED_MED_THRESHOLD ? 'Med' : 'Slow'}
        </span>
      </div>
    </div>
  );
}

// ─── Output Panel ─────────────────────────────────────────────────────────────

function OutputPanel({ stdout, darkMode }) {
  return (
    <div className={`rounded-xl border overflow-hidden
      ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b
        ${darkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-600'}`}>
        <FiTerminal className="w-3.5 h-3.5" />
        Output
      </div>
      <pre
        className={`px-3 py-2 text-xs font-mono overflow-auto whitespace-pre-wrap
          ${darkMode ? 'text-green-400' : 'text-green-700'}`}
        style={{ minHeight: '3rem', maxHeight: '7rem' }}
      >
        {stdout || <span className={darkMode ? 'text-gray-600' : 'text-gray-400'}>(no output yet)</span>}
      </pre>
    </div>
  );
}

// ─── Main ExecutionVisualizer ─────────────────────────────────────────────────

export default function ExecutionVisualizer({ code, language, darkMode }) {
  const [traceResult, setTraceResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const playTimer = useRef(null);

  const runTrace = useCallback(async () => {
    if (!code?.trim()) { setTraceResult(null); setError(null); return; }
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

  // Auto-play timer
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
      }, speed);
    } else {
      clearInterval(playTimer.current);
    }
    return () => clearInterval(playTimer.current);
  }, [playing, traceResult, speed]);

  const steps = traceResult?.steps || [];
  const currentStep = steps[stepIndex] || null;
  const currentLine = currentStep?.line ?? null;
  // Look ahead for next line
  const nextLine = steps[stepIndex + 1]?.line ?? null;

  if (!code?.trim()) {
    return (
      <div className={`flex flex-col items-center justify-center flex-1 h-64 rounded-xl border-2 border-dashed text-center p-8
        ${darkMode ? 'border-gray-700 text-gray-600' : 'border-gray-300 text-gray-400'}`}>
        <FiCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-base font-medium">No code to execute</p>
        <p className="text-sm mt-1 opacity-70">Write Python or JavaScript code in the editor, then click Run &amp; Trace</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Run button + truncation warning */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={runTrace}
          disabled={loading}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg
            ${darkMode
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-50'
              : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 disabled:opacity-50'
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

      {/* Error banners */}
      {error && (
        <div className={`flex items-start gap-2 p-3 rounded-xl text-sm
          ${darkMode ? 'bg-red-900/40 border border-red-700 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <FiAlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {traceResult?.error && (
        <div className={`p-3 rounded-xl text-xs font-mono overflow-auto
          ${darkMode ? 'bg-red-900/30 border border-red-800 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}
          style={{ maxHeight: '100px' }}>
          <strong>Runtime error:</strong>
          <pre className="mt-1 whitespace-pre-wrap">{traceResult.error}</pre>
        </div>
      )}

      {/* Main visualization area */}
      {traceResult && steps.length > 0 && (
        <div className="flex flex-col gap-4 flex-1">
          {/* Code + Memory side-by-side within the right panel */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="space-y-2">
              <CodePanel code={code} currentLine={currentLine} nextLine={nextLine} darkMode={darkMode} />
            </div>
            <div
              className={`rounded-xl border p-3 overflow-auto ${darkMode ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-white'}`}
              style={{ minHeight: '200px', maxHeight: '360px' }}
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
              if (playing) { setPlaying(false); }
              else {
                if (stepIndex >= steps.length - 1) setStepIndex(0);
                setPlaying(true);
              }
            }}
            onReset={() => { setPlaying(false); setStepIndex(0); }}
            playing={playing}
            darkMode={darkMode}
            speed={speed}
            onSpeedChange={setSpeed}
          />

          {/* Output */}
          <OutputPanel stdout={currentStep?.stdout || ''} darkMode={darkMode} />
        </div>
      )}

      {traceResult && steps.length === 0 && (
        <p className={`text-sm italic ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          No execution steps captured. The code may have no executable statements.
        </p>
      )}
    </div>
  );
}

