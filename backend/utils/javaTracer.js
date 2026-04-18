/**
 * javaTracer.js – compiles and steps through Java code using jdb.
 *
 * Notes/limitations:
 * - Intended for local development. Not suitable for untrusted public endpoints.
 * - Best-effort parsing of locals; values are returned mostly as strings.
 */

'use strict';

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');

const MAX_STEPS = 500;
const TIMEOUT_MS = 15_000;
const OUTPUT_TIMEOUT_MS = 4_000;

function detectPublicClassName(code) {
  const m = code.match(/\bpublic\s+class\s+([A-Za-z_][\w]*)\b/);
  return m ? m[1] : null;
}

function findMainClassName(code) {
  const mainIdx = code.search(/\bstatic\s+void\s+main\s*\(/);
  if (mainIdx === -1) return null;

  const before = code.slice(0, mainIdx);
  const re = /\bclass\s+([A-Za-z_][\w]*)\b/g;
  let match;
  let last = null;
  while ((match = re.exec(before)) !== null) {
    last = match[1];
  }
  return last;
}

function normalizeJavaForSingleFileCompilation(code) {
  // Goal: pick the class containing main() as the program entry,
  // and ensure only that class is public (Java restriction).
  const mainClass = findMainClassName(code) || detectPublicClassName(code) || 'Main';
  let normalized = code;

  // Demote any other public classes so compilation succeeds even if the snippet
  // contains multiple helper classes.
  normalized = normalized.replace(/\bpublic\s+class\s+([A-Za-z_][\w]*)\b/g, (full, name) => {
    if (name === mainClass) return full;
    return `class ${name}`;
  });

  // Ensure the main class is public so the filename can match it.
  const mainPublicRe = new RegExp(`\\bpublic\\s+class\\s+${mainClass}\\b`);
  const mainNonPublicRe = new RegExp(`\\bclass\\s+${mainClass}\\b`);
  if (!mainPublicRe.test(normalized) && mainNonPublicRe.test(normalized)) {
    normalized = normalized.replace(mainNonPublicRe, `public class ${mainClass}`);
  }

  return { mainClass, normalized };
}

function looksLikeFullJavaProgram(code) {
  return /\bclass\b/.test(code) && /\bstatic\s+void\s+main\b/.test(code);
}

function findFirstExecutableLineInMain(code) {
  const lines = code.split(/\r?\n/);

  // Locate the main method signature line.
  let mainSigLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/\bstatic\s+void\s+main\s*\(/.test(l) && /\)\s*\{?/.test(l)) {
      mainSigLine = i;
      break;
    }
  }
  if (mainSigLine === -1) return null;

  let inBlockComment = false;
  let bodyStarted = false;
  for (let i = mainSigLine; i < lines.length; i++) {
    let l = lines[i];

    // Handle block comments.
    if (inBlockComment) {
      const endIdx = l.indexOf('*/');
      if (endIdx !== -1) {
        inBlockComment = false;
        l = l.slice(endIdx + 2);
      } else {
        continue;
      }
    }

    // Strip inline block comments (best-effort).
    while (true) {
      const startIdx = l.indexOf('/*');
      if (startIdx === -1) break;
      const endIdx = l.indexOf('*/', startIdx + 2);
      if (endIdx === -1) {
        inBlockComment = true;
        l = l.slice(0, startIdx);
        break;
      }
      l = l.slice(0, startIdx) + l.slice(endIdx + 2);
    }

    // Strip single-line comments.
    l = l.replace(/\/\/.*$/, '');

    if (!bodyStarted) {
      if (l.includes('{')) bodyStarted = true;
      continue;
    }

    const trimmed = l.trim();
    if (!trimmed) continue;
    if (trimmed === '{' || trimmed === '}' || trimmed === '};') continue;
    // First non-empty, non-brace line inside main.
    return i + 1; // 1-based
  }

  return null;
}

async function runJavaForOutput(tempDir, className, timeoutMs = OUTPUT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const proc = spawn('java', ['-classpath', tempDir, className], { cwd: tempDir, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    proc.stderr.on('data', (d) => { stderr += d.toString('utf8'); });

    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* ignore */ }
    }, timeoutMs);

    proc.on('close', () => {
      clearTimeout(timer);
      // Limit output size to avoid huge payloads.
      const cap = 64 * 1024;
      const out = stdout.slice(0, cap);
      const err = stderr.slice(0, cap);
      resolve({ stdout: out, stderr: err });
    });
  });
}

function findPrintStatementLines(userCode) {
  const lines = userCode.split(/\r?\n/);
  const out = new Set();
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    if (l.includes('System.out.println') || l.includes('System.out.print')) {
      out.add(i + 1); // 1-based
    }
  }
  return out;
}

function splitOutputIntoChunks(output) {
  // Prefer line-based chunks (like a terminal). Keep trailing newlines.
  if (!output) return [];
  const chunks = [];
  const re = /.*?\n|.+$/g;
  let m;
  while ((m = re.exec(output)) !== null) {
    chunks.push(m[0]);
  }
  return chunks;
}

function wrapJavaSnippet(snippet) {
  const header = [
    'public class Main {',
    '  public static void main(String[] args) throws Exception {',
  ];
  const footer = [
    '  }',
    '}',
  ];
  const snippetLines = snippet.split(/\r?\n/);
  const indented = snippetLines.map((l) => `    ${l}`);
  const full = [...header, ...indented, ...footer].join('\n') + '\n';
  const startLine = header.length + 1; // first snippet line in generated file (1-based)
  const userEndLine = startLine + snippetLines.length - 1;
  return {
    className: 'Main',
    fileName: 'Main.java',
    source: full,
    userStartLine: startLine,
    userEndLine,
    breakLine: startLine,
  };
}

async function writeJavaSource(tempDir, code) {
  if (looksLikeFullJavaProgram(code)) {
    const { mainClass, normalized } = normalizeJavaForSingleFileCompilation(code);
    const className = mainClass;
    const fileName = `${mainClass}.java`;
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, normalized, 'utf8');
    // Unknown start line mapping for full programs; treat as 1.
    const breakLine = findFirstExecutableLineInMain(normalized) || 1;
    return {
      className,
      fileName,
      filePath,
      userStartLine: 1,
      userEndLine: null,
      breakLine,
    };
  }

  const wrapped = wrapJavaSnippet(code);
  const filePath = path.join(tempDir, wrapped.fileName);
  await fs.writeFile(filePath, wrapped.source, 'utf8');
  return {
    className: wrapped.className,
    fileName: wrapped.fileName,
    filePath,
    userStartLine: wrapped.userStartLine,
    userEndLine: wrapped.userEndLine,
    breakLine: wrapped.breakLine,
  };
}

function parseLineNumber(whereOutput) {
  // Example: [1] Main.main (Main.java:3)
  const m = whereOutput.match(/\(([^:()]+):(\d+)\)/);
  return m ? Number(m[2]) : null;
}

function parseJdbCurrentLine(output) {
  // Examples:
  // "thread=main", Main.main(), line=3 bci=0
  // Step completed: "thread=main", Main.main(), line=4 bci=2
  const m = output.match(/\bline=(\d+)\b/);
  if (m) return Number(m[1]);
  // Fallback: Main.java:3
  const m2 = output.match(/\(([^:()]+):(\d+)\)/);
  return m2 ? Number(m2[2]) : null;
}

function parseLocals(localsOutput) {
  const locals = {};
  const lines = localsOutput.split(/\r?\n/);
  let inVars = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    if (line.startsWith('Local variables:')) { inVars = true; continue; }
    if (line.startsWith('Method arguments:')) { inVars = true; continue; }
    if (!inVars) continue;

    const m = line.match(/^([A-Za-z_$][\w$]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const name = m[1];
    const valueRaw = m[2].trim();

    // Heuristic typing
    if (/^-?\d+(\.\d+)?$/.test(valueRaw)) {
      locals[name] = { type: 'number', value: Number(valueRaw) };
    } else if (valueRaw === 'true' || valueRaw === 'false') {
      locals[name] = { type: 'boolean', value: valueRaw === 'true' };
    } else {
      // Keep the jdb representation; trim noisy id suffix for common cases.
      const cleaned = valueRaw.replace(/\s*\(id=\d+\)\s*$/, '');
      locals[name] = { type: 'string', value: cleaned };
    }
  }
  return locals;
}

function createJdbSession(proc) {
  let buffer = '';
  let closed = false;

  const anyPromptRe = /(?:^|\n)(?:> |[A-Za-z0-9_.$<>]+\[\d+\] )$/;
  const suspendedPromptRe = /(?:^|\n)(?:[A-Za-z0-9_.$<>]+\[\d+\] )$/;

  proc.stdout.on('data', (d) => { buffer += d.toString('utf8'); });
  proc.stderr.on('data', (d) => { buffer += d.toString('utf8'); });
  proc.on('close', () => { closed = true; });

  function waitForPrompt(timeoutMs = 4000, kind = 'any') {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        const re = kind === 'suspended' ? suspendedPromptRe : anyPromptRe;
        if (re.test(buffer)) {
          const out = buffer;
          buffer = '';
          return resolve(out);
        }
        if (closed) {
          const out = buffer;
          buffer = '';
          return resolve(out);
        }
        if (Date.now() - start > timeoutMs) {
          const out = buffer;
          buffer = '';
          return reject(new Error(`jdb timed out waiting for prompt. Partial output: ${out.slice(-400)}`));
        }
        setTimeout(tick, 25);
      };
      tick();
    });
  }

  async function send(cmd) {
    // If the previous prompt is still buffered, discard it so we wait for
    // fresh output from the command we're about to send.
    if (anyPromptRe.test(buffer)) {
      buffer = '';
    }
    proc.stdin.write(cmd + '\n', 'utf8');
    const out = await waitForPrompt();
    return out;
  }

  async function sendWhileSuspended(cmd, timeoutMs = 8000) {
    if (closed) {
      throw new Error('jdb exited unexpectedly');
    }
    if (anyPromptRe.test(buffer)) {
      buffer = '';
    }
    proc.stdin.write(cmd + '\n', 'utf8');
    const out = await waitForPrompt(timeoutMs, 'suspended');
    return out;
  }

  return { waitForPrompt, send, sendWhileSuspended, kill: () => proc.kill('SIGKILL') };
}

async function traceJava(code) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeviz-java-'));
  let filePath;

  const { className, fileName, userStartLine, userEndLine, breakLine } = await writeJavaSource(tempDir, code);
  filePath = path.join(tempDir, fileName);

  const compile = spawn('javac', ['-g', '-encoding', 'UTF-8', filePath], { cwd: tempDir });
  let compileErr = '';
  compile.stderr.on('data', (d) => { compileErr += d.toString('utf8'); });

  const compileExit = await new Promise((resolve) => compile.on('close', resolve));
  if (compileExit !== 0) {
    throw new Error(`Java compile failed: ${compileErr.trim() || 'unknown error'}`);
  }

  // Capture program output in a clean way.
  // Note: this executes the program once outside the debugger.
  const { stdout: programStdout, stderr: programStderr } = await runJavaForOutput(tempDir, className);
  const combinedOutput = (programStdout || '') + (programStderr ? (programStdout ? '\n' : '') + programStderr : '');

  // Step-by-step output: reveal output gradually as we execute print statements.
  // This is a best-effort approximation (like Python's incremental stdout),
  // but avoids scraping jdb's noisy stream.
  const printLines = findPrintStatementLines(code);
  const outputChunks = splitOutputIntoChunks(combinedOutput);
  let outputChunkIdx = 0;
  let stepStdoutSoFar = '';

  const jdb = spawn('jdb', ['-classpath', tempDir, className], { cwd: tempDir, stdio: ['pipe', 'pipe', 'pipe'] });
  const session = createJdbSession(jdb);

  const steps = [];
  let truncated = false;
  let runtimeError = null;
  const startTime = Date.now();

  try {
    await session.waitForPrompt();

    // Break at first user line inside main (best-effort).
    // For full programs, this will likely land somewhere inside main; if not, we still get stepping.
    await session.send(`stop at ${className}:${breakLine}`);

    const runOut = await session.sendWhileSuspended('run', 12_000);
    if (/The application exited/i.test(runOut)) {
      return { steps: [], output: combinedOutput, error: null, truncated: false };
    }

    let absLine = parseJdbCurrentLine(runOut);
    if (!absLine || /Nothing suspended|No default thread specified/i.test(runOut)) {
      throw new Error('jdb did not suspend at breakpoint; cannot trace Java execution');
    }

    for (let i = 0; i < MAX_STEPS; i++) {
      if (Date.now() - startTime > TIMEOUT_MS) {
        truncated = true;
        runtimeError = 'Execution timed out';
        break;
      }

      if (userEndLine && absLine > userEndLine) break;

      const mappedLine = absLine >= userStartLine ? absLine - (userStartLine - 1) : absLine;

      const localsOut = await session.send('locals');
      if (/The application exited/i.test(localsOut)) break;

      const locals = parseLocals(localsOut);

      steps.push({
        event: 'line',
        line: mappedLine,
        stdout: stepStdoutSoFar,
        callStack: [{ funcName: 'main', line: mappedLine, locals }],
      });

      const nextOut = await session.sendWhileSuspended('next', 8000);
      if (/The application exited/i.test(nextOut)) break;

      // If we just executed a print line, reveal one chunk of output.
      // This handles loops naturally because the same line will be visited repeatedly.
      if (printLines.has(mappedLine) && outputChunkIdx < outputChunks.length) {
        stepStdoutSoFar += outputChunks[outputChunkIdx++];
      }

      const nextLine = parseJdbCurrentLine(nextOut);
      if (nextLine) absLine = nextLine;
    }

    if (steps.length >= MAX_STEPS) truncated = true;
  } catch (err) {
    runtimeError = err.message;
  } finally {
    try { await session.send('quit'); } catch { /* ignore */ }
    session.kill();
    // Best-effort cleanup
    try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }

  return {
    steps,
    output: combinedOutput,
    error: runtimeError,
    truncated,
  };
}

module.exports = { traceJava };
