/**
 * typescriptTracer.js – transpiles TypeScript/TSX into plain JS and reuses the
 * existing JavaScript tracer. Uses sourcemaps to map generated line numbers
 * back to original source lines so the UI highlights the right lines.
 */

'use strict';

const esbuild = require('esbuild');
const { SourceMapConsumer } = require('source-map');
const { traceJavaScript } = require('./jsTracer');

function looksLikeTsx(code) {
  // Heuristic: TSX commonly has JSX tags and parentheses returns.
  // This is intentionally conservative.
  return /<\s*[A-Za-z][^>]*>/.test(code) || /<\s*\/?\s*[A-Za-z][^>]*\/>/.test(code);
}

async function transpileTypeScript(code) {
  const loader = looksLikeTsx(code) ? 'tsx' : 'ts';

  // Use CommonJS output because the JS tracer parses/executes as a script.
  // We do not bundle; imports will remain as requires and likely fail inside
  // the sandbox — same limitation as the current JS tracer.
  return esbuild.transform(code, {
    loader,
    format: 'cjs',
    target: 'es2022',
    sourcemap: 'external',
    sourcefile: 'input.ts',
    logLevel: 'silent',
  });
}

function mapLine(lineNo, consumer) {
  if (!consumer || !lineNo || lineNo <= 0) return lineNo;
  try {
    const pos = consumer.originalPositionFor({ line: lineNo, column: 0 });
    return pos && pos.line ? pos.line : lineNo;
  } catch {
    return lineNo;
  }
}

async function traceTypeScript(code) {
  const { code: jsCode, map } = await transpileTypeScript(code);

  const trace = traceJavaScript(jsCode);

  // If transform didn't return a map for some reason, just return trace.
  if (!map) {
    return trace;
  }

  let consumer;
  try {
    consumer = await new SourceMapConsumer(map);
  } catch {
    return trace;
  }

  try {
    if (Array.isArray(trace.steps)) {
      trace.steps = trace.steps.map((s) => {
        const mappedLine = mapLine(s.line, consumer);
        const mappedStack = (s.callStack || []).map((f) => ({
          ...f,
          line: mapLine(f.line, consumer),
        }));
        return { ...s, line: mappedLine, callStack: mappedStack };
      });
    }
  } finally {
    // source-map v0.8 consumer has destroy(); older versions have close().
    if (typeof consumer.destroy === 'function') consumer.destroy();
    else if (typeof consumer.close === 'function') consumer.close();
  }

  return trace;
}

module.exports = { traceTypeScript };
