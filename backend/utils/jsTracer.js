/**
 * jsTracer.js – instruments JavaScript code with acorn AST analysis and
 * executes it in a Node.js vm sandbox to produce a step-by-step execution trace.
 */

'use strict';

const vm = require('vm');
const acorn = require('acorn');

const MAX_STEPS = 500;
const TIMEOUT_MS = 5000;

// ─── Variable name collector ──────────────────────────────────────────────────

/**
 * Walk an acorn AST node and collect all variable / param names declared in it.
 */
function collectNames(node, names = new Set()) {
  if (!node || typeof node !== 'object') return names;

  if (node.type === 'VariableDeclaration') {
    for (const decl of node.declarations) {
      if (decl.id && decl.id.type === 'Identifier') {
        names.add(decl.id.name);
      }
    }
  }
  if (node.type === 'FunctionDeclaration' && node.id) {
    names.add(node.id.name);
    for (const p of node.params || []) {
      if (p.type === 'Identifier') names.add(p.name);
    }
  }
  if (node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
    for (const p of node.params || []) {
      if (p.type === 'Identifier') names.add(p.name);
    }
  }
  if (node.type === 'AssignmentExpression' && node.left && node.left.type === 'Identifier') {
    names.add(node.left.name);
  }

  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end') continue;
    const child = node[key];
    if (Array.isArray(child)) {
      child.forEach((c) => collectNames(c, names));
    } else if (child && typeof child === 'object' && child.type) {
      collectNames(child, names);
    }
  }
  return names;
}

// ─── Code instrumentor ────────────────────────────────────────────────────────

/**
 * Collect all statement end positions and their line numbers from the AST.
 * We insert __trace__ calls after every statement.
 */
function collectStatements(body, stmts = []) {
  for (const node of body || []) {
    stmts.push({ start: node.start, end: node.end, loc: node.loc });

    // Recurse into function / block bodies so inner statements are traced too
    if (node.body) {
      if (Array.isArray(node.body)) {
        collectStatements(node.body, stmts);
      } else if (node.body.body) {
        collectStatements(node.body.body, stmts);
      }
    }
    if (node.consequent) {
      const c = node.consequent;
      if (c.body) collectStatements(c.body, stmts);
      else collectStatements([c], stmts);
    }
    if (node.alternate) {
      const a = node.alternate;
      if (a.body) collectStatements(a.body, stmts);
      else collectStatements([a], stmts);
    }
  }
  return stmts;
}

/**
 * Insert __trace__(lineNo, captureExpr) snippets after each statement.
 * captureExpr is an IIFE that tries to snapshot all known variable names.
 */
function instrumentCode(code, allNames) {
  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', locations: true });
  } catch {
    // If we can't parse it, return code unchanged (tracer will likely get a syntax error too)
    return code;
  }

  const stmts = collectStatements(ast.body);
  // Sort by end position descending so we can splice from the back without shifting offsets
  stmts.sort((a, b) => b.end - a.end);

  const namesArr = [...allNames].filter((n) => /^\w+$/.test(n));

  // Build the capture lambda: (()=>{ try{ return {x,y,z}; }catch(_){return {};} })()
  const captureBody = namesArr.length > 0
    ? `try{return {${namesArr.join(',')}}}catch(_e){return {}}`
    : 'return {}';
  const captureExpr = `(function(){${captureBody}})()`;

  let result = code;
  const inserted = new Set();

  for (const stmt of stmts) {
    const line = stmt.loc ? stmt.loc.end.line : 0;
    // Avoid duplicate insertions at the same end offset
    if (inserted.has(stmt.end)) continue;
    inserted.add(stmt.end);

    const traceCall = `;__trace__(${line},${captureExpr});`;
    result = result.slice(0, stmt.end) + traceCall + result.slice(stmt.end);
  }

  return result;
}

// ─── Main tracer ──────────────────────────────────────────────────────────────

function traceJavaScript(code) {
  // Collect all variable/param names for capture
  let allNames = new Set();
  try {
    const ast = acorn.parse(code, { ecmaVersion: 2022, sourceType: 'script', locations: true });
    collectNames(ast, allNames);
  } catch {
    // syntax error – still try to run so user sees the error
  }

  const steps = [];
  const outputLines = [];
  let stepCount = 0;
  let callStack = [];

  const instrumented = instrumentCode(code, allNames);

  const sandbox = {
    console: {
      log: (...args) => {
        const line = args.map((a) => {
          try { return JSON.stringify(a); } catch { return String(a); }
        }).join(' ');
        outputLines.push(line);
      },
      error: (...args) => {
        const line = args.map((a) => {
          try { return JSON.stringify(a); } catch { return String(a); }
        }).join(' ');
        outputLines.push(`[error] ${line}`);
      },
      warn: (...args) => {
        const line = args.map((a) => {
          try { return JSON.stringify(a); } catch { return String(a); }
        }).join(' ');
        outputLines.push(`[warn] ${line}`);
      },
    },
    __trace__: (lineNo, vars) => {
      if (stepCount >= MAX_STEPS) return;
      stepCount++;

      const safeVars = {};
      for (const [k, v] of Object.entries(vars || {})) {
        safeVars[k] = safeReprJs(v);
      }

      steps.push({
        event: 'line',
        line: lineNo,
        stdout: outputLines.join('\n'),
        callStack: [{ funcName: 'global', line: lineNo, locals: safeVars }],
      });
    },
  };

  let errorMsg = null;
  let truncated = false;

  // NOTE: Executing user-supplied code is intentional – this tool is a local
  // code visualization utility.  The vm sandbox is a best-effort isolation
  // layer (prevents accidental access to the host require/process globals).
  // It is NOT a hardened security boundary and should not be exposed on a
  // public internet endpoint without additional process-level sandboxing.
  try {
    // lgtm[js/code-injection] -- intentional: this is a code execution visualizer
    const script = new vm.Script(instrumented, { filename: '<user_code>' });
    const ctx = vm.createContext(sandbox);
    script.runInContext(ctx, { timeout: TIMEOUT_MS });
  } catch (err) {
    if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
      errorMsg = 'Execution timed out (possible infinite loop)';
      truncated = true;
    } else {
      errorMsg = err.message;
    }
  }

  if (stepCount >= MAX_STEPS) truncated = true;

  return {
    steps,
    output: outputLines.join('\n'),
    error: errorMsg,
    truncated,
  };
}

// ─── Safe JS value serializer ─────────────────────────────────────────────────

function safeReprJs(val, depth = 0) {
  if (depth > 2) return { type: '...', value: '...' };
  if (val === null) return { type: 'null', value: null };
  if (val === undefined) return { type: 'undefined', value: 'undefined' };
  const t = typeof val;
  if (t === 'boolean') return { type: 'boolean', value: val };
  if (t === 'number') return { type: 'number', value: val };
  if (t === 'string') {
    const v = val.length > 200 ? val.slice(0, 200) + '...' : val;
    return { type: 'string', value: v };
  }
  if (t === 'function') return { type: 'function', value: `[Function: ${val.name || 'anonymous'}]` };
  if (Array.isArray(val)) {
    return {
      type: 'Array',
      id: null,
      value: val.slice(0, 20).map((x) => safeReprJs(x, depth + 1)),
    };
  }
  if (t === 'object') {
    const entries = {};
    let count = 0;
    for (const k of Object.keys(val)) {
      if (count++ >= 20) break;
      try { entries[k] = safeReprJs(val[k], depth + 1); } catch { entries[k] = { type: '?', value: '?' }; }
    }
    return { type: 'Object', id: null, value: entries };
  }
  return { type: t, value: String(val) };
}

module.exports = { traceJavaScript };
