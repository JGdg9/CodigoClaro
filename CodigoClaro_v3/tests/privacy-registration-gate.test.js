/** CódigoClaro — El registro público debe permanecer cerrado mientras no se habilite explícitamente. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');

async function startTestServer(dbPath, registrationEnabled) {
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const chosen = server.address().port;
      server.close(error => error ? reject(error) : resolve(chosen));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: String(port),
    DB_PATH: dbPath,
    NODE_ENV: 'production',
    SESSION_SECRET: 'test-only-secret-long-enough-for-production-mode'
  };
  if (registrationEnabled === undefined) delete env.PUBLIC_REGISTRATION_ENABLED;
  else env.PUBLIC_REGISTRATION_ENABLED = String(registrationEnabled);
  const proc = spawn(process.execPath, ['server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  proc.stdout.on('data', chunk => { output += chunk.toString(); });
  proc.stderr.on('data', chunk => { output += chunk.toString(); });
  for (let i = 0; i < 120; i++) {
    if (proc.exitCode !== null) throw new Error(`El servidor terminó durante el arranque: ${output}`);
    try {
      if ((await fetch(`${base}/api/health`)).ok) return { base, proc };
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await stopTestServer(proc);
  throw new Error(`El servidor de prueba no respondió: ${output}`);
}

async function stopTestServer(proc) {
  if (!proc || proc.exitCode !== null) return;
  proc.kill('SIGTERM');
  await new Promise(resolve => {
    const timeout = setTimeout(resolve, 2000);
    proc.once('exit', () => { clearTimeout(timeout); resolve(); });
  });
}

test('el servidor no crea cuentas cuando el registro público está cerrado', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-privacy-gate-'));
  const dbPath = path.join(temp, 'privacy.sqlite');
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const chosen = server.address().port;
      server.close(error => error ? reject(error) : resolve(chosen));
    });
  });
  const base = `http://127.0.0.1:${port}`;
  const env = {
    ...process.env,
    PORT: String(port),
    DB_PATH: dbPath,
    NODE_ENV: 'production',
    PUBLIC_REGISTRATION_ENABLED: 'false',
    SESSION_SECRET: 'test-only-secret-long-enough-for-production-mode'
  };
  const proc = spawn(process.execPath, ['server.js'], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  proc.stdout.on('data', chunk => { output += chunk.toString(); });
  proc.stderr.on('data', chunk => { output += chunk.toString(); });

  try {
    let ready = false;
    for (let i = 0; i < 120; i++) {
      if (proc.exitCode !== null) throw new Error(`El servidor terminó durante el arranque: ${output}`);
      try {
        const response = await fetch(`${base}/api/health`);
        if (response.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, `El servidor de prueba no respondió: ${output}`);

    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.registrationEnabled, false);
    const response = await fetch(`${base}/api/register`, {
      method: 'POST',
      headers: { origin: base, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'externo@codigoclaro.test', password: 'ClaveSegura_2026!', name: 'Prueba', consent: true })
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /privacidad/i);
    const db = new DatabaseSync(dbPath);
    try { assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 0); }
    finally { db.close(); }
  } finally {
    if (proc.exitCode === null) {
      proc.kill('SIGTERM');
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 2000);
        proc.once('exit', () => { clearTimeout(timeout); resolve(); });
      });
    }
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('producción mantiene cerrado el registro si no se configura la bandera', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-privacy-default-'));
  let running;
  try {
    running = await startTestServer(path.join(temp, 'privacy.sqlite'), undefined);
    const health = await (await fetch(`${running.base}/api/health`)).json();
    assert.equal(health.registrationEnabled, false);
    const response = await fetch(`${running.base}/api/register`, {
      method: 'POST',
      headers: { origin: running.base, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'default-closed@codigoclaro.test', password: 'ClaveSegura_2026!', name: 'Prueba', consent: true })
    });
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /privacidad/i);
  } finally {
    await stopTestServer(running?.proc);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('el inicio de sesión y las sesiones existentes funcionan con el registro cerrado', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-privacy-login-'));
  const dbPath = path.join(temp, 'privacy.sqlite');
  let running;
  try {
    running = await startTestServer(dbPath, true);
    const account = { email: 'cuenta-existente@codigoclaro.test', password: 'ClaveSegura_2026!', name: 'Cuenta existente', consent: true };
    const created = await fetch(`${running.base}/api/register`, {
      method: 'POST',
      headers: { origin: running.base, 'content-type': 'application/json' },
      body: JSON.stringify(account)
    });
    assert.equal(created.status, 201);
    const existingCookie = created.headers.get('set-cookie').split(';')[0];
    await stopTestServer(running.proc);

    running = await startTestServer(dbPath, false);
    const health = await (await fetch(`${running.base}/api/health`)).json();
    assert.equal(health.registrationEnabled, false);

    const existingSession = await fetch(`${running.base}/api/me`, { headers: { cookie: existingCookie } });
    assert.equal(existingSession.status, 200);
    assert.equal((await existingSession.json()).user.email, account.email);

    const login = await fetch(`${running.base}/api/login`, {
      method: 'POST',
      headers: { origin: running.base, 'content-type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: account.password })
    });
    assert.equal(login.status, 200);
    const loginCookie = login.headers.get('set-cookie').split(';')[0];
    const me = await fetch(`${running.base}/api/me`, { headers: { cookie: loginCookie } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.email, account.email);

    const db = new DatabaseSync(dbPath);
    try { assert.equal(db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1); }
    finally { db.close(); }
  } finally {
    await stopTestServer(running?.proc);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
