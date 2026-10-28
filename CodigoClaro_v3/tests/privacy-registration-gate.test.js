/** CódigoClaro — El registro queda cerrado por defecto y se habilita solo en el piloto configurado. */
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

async function startTestServer(dbPath, registrationOpen, extraEnv = {}) {
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
    ...extraEnv,
    PORT: String(port),
    DB_PATH: dbPath,
    NODE_ENV: extraEnv.NODE_ENV || 'production',
    SESSION_SECRET: 'test-only-secret-long-enough-for-production-mode'
  };
  if (registrationOpen === undefined) delete env.REGISTRATION_OPEN;
  else env.REGISTRATION_OPEN = String(registrationOpen);
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

async function readRegistrationConfig(base) {
  const response = await fetch(base + '/api/config');
  assert.equal(response.status, 200);
  const config = await response.json();
  assert.deepEqual(Object.keys(config), ['registrationOpen']);
  assert.equal(typeof config.registrationOpen, 'boolean');
  return config.registrationOpen;
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
    REGISTRATION_OPEN: 'false',
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
    assert.equal(await readRegistrationConfig(base), false);
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
    assert.equal(await readRegistrationConfig(running.base), false);
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

test('el piloto crea cuentas de estudiante y las sesiones existentes siguen funcionando si se cierra el registro', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-privacy-login-'));
  const dbPath = path.join(temp, 'privacy.sqlite');
  let running;
  try {
    running = await startTestServer(dbPath, true, { ADMIN_EMAIL: 'cuenta-existente@codigoclaro.test' });
    const openHealth = await (await fetch(`${running.base}/api/health`)).json();
    assert.equal(openHealth.registrationEnabled, true);
    assert.equal(await readRegistrationConfig(running.base), true);
    const account = { email: 'cuenta-existente@codigoclaro.test', password: 'ClaveSegura_2026!', name: 'Cuenta existente', consent: true, role: 'admin', isAdmin: true };
    const created = await fetch(`${running.base}/api/register`, {
      method: 'POST',
      headers: { origin: running.base, 'content-type': 'application/json' },
      body: JSON.stringify(account)
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).user.role, 'student', 'registrarse con ADMIN_EMAIL no concede permisos administrativos');
    const existingCookie = created.headers.get('set-cookie').split(';')[0];
    await stopTestServer(running.proc);

    running = await startTestServer(dbPath, false);
    const health = await (await fetch(`${running.base}/api/health`)).json();
    assert.equal(health.registrationEnabled, false);
    assert.equal(await readRegistrationConfig(running.base), false);

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

test('el registro queda cerrado por defecto en desarrollo e ignora la variable anterior', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-privacy-dev-default-'));
  let running;
  try {
    running = await startTestServer(path.join(temp, 'privacy.sqlite'), undefined, {
      NODE_ENV: 'development',
      PUBLIC_REGISTRATION_ENABLED: 'true'
    });
    const health = await (await fetch(running.base + '/api/health')).json();
    assert.equal(health.registrationEnabled, false);
    assert.equal(await readRegistrationConfig(running.base), false);
    const response = await fetch(running.base + '/api/register', {
      method: 'POST',
      headers: { origin: running.base, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'dev-default-closed@codigoclaro.test', password: 'ClaveSegura_2026!', name: 'Prueba', consent: true })
    });
    assert.equal(response.status, 503);
  } finally {
    await stopTestServer(running?.proc);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('el Blueprint de Render abre ambas banderas de registro para el piloto', () => {
  const blueprint = fs.readFileSync(path.join(root, 'render.yaml'), 'utf8');
  const valueFor = name => {
    const match = blueprint.match(new RegExp(`^[ \\t]*- key: ${name}\\r?\\n[ \\t]+value: ["']([^"']+)["']$`, 'm'));
    return match?.[1]?.toLowerCase() || null;
  };
  assert.equal(valueFor('PUBLIC_REGISTRATION_ENABLED'), 'true');
  assert.equal(valueFor('REGISTRATION_OPEN'), 'true');
});
