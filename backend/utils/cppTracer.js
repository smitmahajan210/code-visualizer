/**
 * cppTracer.js – compiles and steps through C++ code using lldb in batch mode.
 *
 * Notes/limitations:
 * - Intended for local use (dev tool). Not safe for untrusted public execution.
 * - Captures locals via lldb frame variables; values are best-effort strings.
 */

'use strict';

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs/promises');

const MAX_STEPS = 500;
const TIMEOUT_MS = 15_000;

function hasMainFunction(code) {
  return /\bint\s+main\s*\(/.test(code) || /\bauto\s+main\s*\(/.test(code);
}

function wrapCppSnippet(snippet) {
  const header = [
    '#include <iostream>',
    '#include <vector>',
    '#include <string>',
    '#include <map>',
    '#include <set>',
    '#include <unordered_map>',
    '#include <unordered_set>',
    '#include <algorithm>',
    '#include <cmath>',
    '#include <numeric>',
    '#include <queue>',
    '#include <stack>',
    '#include <deque>',
    '#include <sstream>',
    '#include <iomanip>',
    'using namespace std;',
    'int main() {',
  ];
  const footer = [
    '  return 0;',
    '}',
  ];

  const lines = snippet.split(/\r?\n/);
  const indented = lines.map((l) => `  ${l}`);
  const source = [...header, ...indented, ...footer].join('\n') + '\n';
  const userStartLine = header.length + 1; // 1-based
  return { source, userStartLine };
}

async function runProcess(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, opts);
    let stdout = '';
    let stderr = '';
    if (proc.stdout) proc.stdout.on('data', (d) => { stdout += d.toString('utf8'); });
    if (proc.stderr) proc.stderr.on('data', (d) => { stderr += d.toString('utf8'); });
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function extractJsonBetweenMarkers(output) {
  const start = output.indexOf('__TRACE_JSON_START__');
  const end = output.indexOf('__TRACE_JSON_END__');
  if (start === -1 || end === -1 || end <= start) return null;
  const jsonText = output.slice(start + '__TRACE_JSON_START__'.length, end).trim();
  // LLDB's `script` mode can sometimes echo Python prompts (>>>).
  const cleaned = jsonText
    .split(/\r?\n/)
    .map((l) => l.replace(/^>>>\s?/, ''))
    .join('\n')
    .trim();
  return cleaned;
}

async function traceCpp(code) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'codeviz-cpp-'));

  const cppPath = path.join(tempDir, 'main.cpp');
  const exePath = path.join(tempDir, 'a.out');
  const stdoutPath = path.join(tempDir, 'stdout.txt');
  const stderrPath = path.join(tempDir, 'stderr.txt');

  let userStartLine = 1;
  let source = code;
  if (!hasMainFunction(code)) {
    const wrapped = wrapCppSnippet(code);
    source = wrapped.source;
    userStartLine = wrapped.userStartLine;
  }

  await fs.writeFile(cppPath, source, 'utf8');
  await fs.writeFile(stdoutPath, '', 'utf8');
  await fs.writeFile(stderrPath, '', 'utf8');

  // Compile with debug info, disable optimizations for better stepping.
  const compile = await runProcess('clang++', ['-std=c++17', '-O0', '-g', cppPath, '-o', exePath], { cwd: tempDir });
  if (compile.code !== 0) {
    throw new Error(`C++ compile failed: ${compile.stderr.trim() || compile.stdout.trim() || 'unknown error'}`);
  }

  const lldbCmdPath = path.join(tempDir, 'trace.lldb');

  const pyModulePath = path.join(tempDir, 'cpptrace.py');
  const pyModule = `import json\nimport time\nimport lldb\n\n\ndef _read_file(p):\n    try:\n        with open(p, 'r', encoding='utf-8', errors='replace') as f:\n            return f.read()\n    except Exception:\n        return ''\n\n\ndef _coerce_value(v):\n    return {'type': 'string', 'value': v if v is not None else 'null'}\n\n\ndef run(stdout_path, user_start, max_steps, timeout_ms):\n    target = lldb.debugger.GetSelectedTarget()\n    process = target.GetProcess()\n\n    steps = []\n    start = time.time()\n\n    def mapped_line(line):\n        if not line:\n            return 1\n        line = int(line)\n        if line >= int(user_start):\n            return line - (int(user_start) - 1)\n        return line\n\n    state = process.GetState()\n    if state != lldb.eStateStopped:\n        out = {\n            'steps': [],\n            'output': _read_file(stdout_path),\n            'error': None,\n            'truncated': False,\n        }\n        print('__TRACE_JSON_START__')\n        print(json.dumps(out))\n        print('__TRACE_JSON_END__')\n        return\n\n    for _ in range(int(max_steps)):\n        if (time.time() - start) * 1000.0 > float(timeout_ms):\n            out = {\n                'steps': steps,\n                'output': _read_file(stdout_path),\n                'error': 'Execution timed out',\n                'truncated': True,\n            }\n            print('__TRACE_JSON_START__')\n            print(json.dumps(out))\n            print('__TRACE_JSON_END__')\n            return\n\n        if process.GetState() != lldb.eStateStopped:\n            break\n\n        thread = process.GetSelectedThread()\n        if not thread.IsValid():\n            break\n\n        frame = thread.GetSelectedFrame()\n        if not frame.IsValid():\n            break\n\n        le = frame.GetLineEntry()\n        line = le.GetLine() if le.IsValid() else 1\n        func = frame.GetFunctionName() or 'main'\n\n        locals_dict = {}\n        vars_list = frame.GetVariables(True, True, False, True)\n        for v in vars_list:\n            try:\n                name = v.GetName()\n                if not name:\n                    continue\n                val = v.GetValue()\n                locals_dict[name] = _coerce_value(val)\n            except Exception:\n                pass\n\n        mline = mapped_line(line)\n        steps.append({\n            'event': 'line',\n            'line': mline,\n            'stdout': _read_file(stdout_path),\n            'callStack': [{ 'funcName': func, 'line': mline, 'locals': locals_dict }],\n        })\n\n        thread.StepOver()\n        process = target.GetProcess()\n        if process.GetState() == lldb.eStateExited:\n            break\n\n    truncated = len(steps) >= int(max_steps)\n    out = {\n        'steps': steps,\n        'output': _read_file(stdout_path),\n        'error': None,\n        'truncated': truncated,\n    }\n    print('__TRACE_JSON_START__')\n    print(json.dumps(out))\n    print('__TRACE_JSON_END__')\n`;

  await fs.writeFile(pyModulePath, pyModule, 'utf8');

  const lldbCommands = [
    'settings set interpreter.prompt-on-quit false',
    `target create "${exePath}"`,
    'breakpoint set --name main',
    `process launch -o "${stdoutPath}" -e "${stderrPath}"`,
    `command script import "${pyModulePath}"`,
    `script cpptrace.run(r"${stdoutPath}", ${userStartLine}, ${MAX_STEPS}, ${TIMEOUT_MS})`,
    'quit',
    '',
  ].join('\n');

  await fs.writeFile(lldbCmdPath, lldbCommands, 'utf8');

  const lldb = spawn('lldb', ['--no-lldbinit', '-b', '-s', lldbCmdPath], { cwd: tempDir, stdio: ['ignore', 'pipe', 'pipe'] });

  let out = '';
  let err = '';
  lldb.stdout.on('data', (d) => { out += d.toString('utf8'); });
  lldb.stderr.on('data', (d) => { err += d.toString('utf8'); });

  const exitCode = await new Promise((resolve) => lldb.on('close', resolve));

  const jsonText = extractJsonBetweenMarkers(out) || extractJsonBetweenMarkers(err);
  if (!jsonText) {
    // Best-effort include some output for debugging
    throw new Error(`Failed to collect C++ trace. lldb exit=${exitCode}. Output: ${(out || err).slice(-400)}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Failed to parse C++ trace JSON. Snippet: ${jsonText.slice(0, 200)}`);
  }

  // Cleanup
  try { await fs.rm(tempDir, { recursive: true, force: true }); } catch { /* ignore */ }

  return parsed;
}

module.exports = { traceCpp };
