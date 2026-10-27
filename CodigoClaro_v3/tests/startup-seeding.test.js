const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');

async function unusedPort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const port = socket.address().port;
      socket.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function startServer(dbPath) {
  const port = await unusedPort();
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: dbPath,
      SESSION_SECRET: 'test-only-secret-that-is-longer-than-thirty-two-characters',
      NODE_ENV: 'development'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let output = '';
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error(`Tiempo agotado esperando el arranque: ${output}`));
    }, 10000);
    const onData = chunk => {
      output += chunk.toString();
      if (output.includes('Piloto listo en')) {
        clearTimeout(timeout);
        proc.stdout.off('data', onData);
        resolve(proc);
      }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', chunk => { output += chunk.toString(); });
    proc.once('error', error => { clearTimeout(timeout); reject(error); });
    proc.once('exit', code => {
      if (code !== null) {
        clearTimeout(timeout);
        reject(new Error(`El servidor terminó con código ${code}: ${output}`));
      }
    });
  });
}

async function stopServer(proc) {
  if (!proc || proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 2000);
    proc.once('exit', () => { clearTimeout(timeout); resolve(); });
  });
}

test('el arranque no sobrescribe las preguntas editadas por administración', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-seed-preservation-'));
  const dbPath = path.join(temp, 'test.sqlite');
  let proc;
  try {
    proc = await startServer(dbPath);
    const db = new DatabaseSync(dbPath);
    const question = db.prepare('SELECT id FROM learning_questions ORDER BY id LIMIT 1').get();
    assert.ok(question, 'el servidor debe sembrar preguntas iniciales');
    const editedPrompt = 'Pregunta editada que debe conservarse tras reiniciar';
    db.prepare('UPDATE learning_questions SET prompt=? WHERE id=?').run(editedPrompt, question.id);
    db.close();

    await stopServer(proc);
    proc = await startServer(dbPath);
    const afterRestart = new DatabaseSync(dbPath);
    assert.equal(afterRestart.prepare('SELECT prompt FROM learning_questions WHERE id=?').get(question.id).prompt, editedPrompt);
    afterRestart.close();
  } finally {
    await stopServer(proc);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
