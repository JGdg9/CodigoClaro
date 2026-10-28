/** Verifica la migración de la ayuda y el inventario documental del repositorio. */
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');

const repoRoot = path.resolve(__dirname, '../..');
const appRoot = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-doc-migration-'));
let base, proc;

async function request(route) { return fetch(base + route); }
async function ready() {
  for (let i = 0; i < 120; i++) {
    if (proc.exitCode !== null) throw new Error('El servidor de prueba terminó durante el arranque.');
    try { if ((await fetch(base + '/api/health')).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('El servidor de prueba no respondió.');
}
before(async () => {
  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const value = server.address().port;
      server.close(() => resolve(value));
    });
  });
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['server.js'], {
    cwd: appRoot,
    env: { ...process.env, PORT: String(port), DB_PATH: path.join(temp, 'docs.sqlite'), SESSION_SECRET: 'documentation-route-test-secret-long-enough', NODE_ENV: 'test' },
    stdio: 'ignore'
  });
  await ready();
});
after(async () => {
  if (proc && proc.exitCode === null) {
    proc.kill('SIGTERM');
    await new Promise(resolve => proc.once('exit', resolve));
  }
  fs.rmSync(temp, { recursive: true, force: true });
});

test('el repositorio conserva únicamente requirements-docs.txt como archivo .txt', () => {
  const files = execFileSync('git', ['ls-files', '-z', '--', '*.txt'], { cwd: repoRoot }).toString('utf8').split('\0').filter(Boolean).sort();
  assert.deepEqual(files, ['CodigoClaro_v3/requirements-docs.txt']);
});

test('las URL antiguas de ayuda sirven el Markdown y el material interno retirado devuelve 404', async () => {
  const aliases = [
    ['/EMPEZAR_AQUI.txt', '/ayuda/EMPEZAR_AQUI.md'], ['/ayuda/EMPEZAR_AQUI.txt', '/ayuda/EMPEZAR_AQUI.md'],
    ['/LEEME.txt', '/ayuda/LEEME.md'], ['/ayuda/LEEME.txt', '/ayuda/LEEME.md'],
    ['/LEEME_IDE.txt', '/ayuda/LEEME_IDE.md'], ['/ayuda/LEEME_IDE.txt', '/ayuda/LEEME_IDE.md'],
    ['/NOTAS_DE_VERSION.txt', '/ayuda/NOTAS_DE_VERSION.md'], ['/ayuda/NOTAS_DE_VERSION.txt', '/ayuda/NOTAS_DE_VERSION.md'],
    ['/README.txt', '/ayuda/README.md'], ['/ayuda/README.txt', '/ayuda/README.md']
  ];
  for (const [legacy, current] of aliases) {
    const [oldResponse, currentResponse] = await Promise.all([request(legacy), request(current)]);
    assert.equal(oldResponse.status, 200, legacy);
    assert.match(oldResponse.headers.get('content-type') || '', /text\/markdown/i, legacy);
    assert.equal(await oldResponse.text(), await currentResponse.text(), legacy);
  }
  for (const route of ['/PRUEBAS_REALIZADAS.txt', '/ayuda/PRUEBAS_REALIZADAS.txt', '/GUIA_PRUEBAS_RAPIDAS.md', '/ayuda/GUIA_PRUEBAS_RAPIDAS.md']) {
    assert.equal((await request(route)).status, 404, route);
  }
});
