/**
 * pythonTracer.js – runs tracer_runner.py as a child process and returns the
 * execution trace for Python code.
 */

const { spawn } = require('child_process');
const path = require('path');

const TRACER_SCRIPT = path.join(__dirname, '..', 'tracer_runner.py');
const TIMEOUT_MS = 10_000; // 10 s hard limit

function tracePython(code) {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [TRACER_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error('Execution timed out'));
    }, TIMEOUT_MS);

    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (!stdout.trim()) {
        return reject(new Error(`Python tracer produced no output. stderr: ${stderr}`));
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Failed to parse tracer output: ${stdout.slice(0, 200)}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.stdin.write(code, 'utf8');
    proc.stdin.end();
  });
}

module.exports = { tracePython };
