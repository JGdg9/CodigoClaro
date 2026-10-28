/** CódigoClaro — Pruebas de seguridad de ejecución, cabeceras HTTP, rutas, sesiones y validación de entradas. */
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let base, proc;
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-hardening-'));
async function request(route, options = {}) {
  return fetch(base + route, { redirect: 'manual', ...options, headers: { ...(options.headers || {}), ...(options.body ? { 'content-type': 'application/json' } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
}
async function ready() {
  for (let i = 0; i < 120; i++) {
    if (proc.exitCode !== null) throw new Error('El servidor terminó durante el arranque.');
    try { const res = await fetch(base + '/api/health'); if (res.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('El servidor de prueba no respondió.');
}
before(async () => {
  const port = await new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), DB_PATH: path.join(temp, 'runtime.sqlite'), SESSION_SECRET: 'test-runtime-secret-longer-than-thirty-two-characters', NODE_ENV: 'development', REGISTRATION_OPEN: 'true' }, stdio: 'ignore' });
  await ready();
});
after(async () => { if (proc && proc.exitCode === null) { proc.kill('SIGTERM'); await new Promise(resolve => proc.once('exit', resolve)); } fs.rmSync(temp, { recursive: true, force: true }); });

test('el health reporta la versión del paquete y las capacidades básicas', async () => {
  const r = await request('/api/health'); const d = await r.json();
  assert.equal(r.status, 200); assert.equal(d.ok, true); assert.equal(d.version, require('../package.json').version); assert.ok(Array.isArray(d.features)); assert.equal(d.registrationEnabled, true);
  const config = await request('/api/config');
  assert.deepEqual(await config.json(), { registrationOpen: true });
  assert.match(fs.readFileSync(path.join(__dirname, '../server.js'), 'utf8'), /db\.prepare\('SELECT 1'\)\.get\(\)/);
});
test('las cabeceras de seguridad están presentes en páginas y API', async () => {
  for (const route of ['/', '/api/health', '/api/config']) {
    const r = await request(route);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(r.headers.get('referrer-policy'), 'same-origin');
    assert.ok(r.headers.get('content-security-policy'));
    assert.ok(r.headers.get('permissions-policy'));
  }
});
test('páginas principales, recursos estáticos y guías heredadas responden correctamente', async () => {
  for (const route of ['/', '/index.html', '/aula.html', '/temarios.html', '/diagnostico.html', '/privacidad.html', '/condiciones.html', '/catalogo_temas.json', '/temarios/Java_Tema_01.pdf', '/Java_Tema_01.pdf', '/ayuda/LEEME.txt', '/EMPEZAR_AQUI.txt', '/GUIA_PRUEBAS_RAPIDAS.md', '/LEEME.txt', '/LEEME_IDE.txt', '/NOTAS_DE_VERSION.txt', '/PRUEBAS_REALIZADAS.txt', '/README.txt']) {
    const r = await request(route); assert.equal(r.status, 200, `${route} debe existir`);
    const type = r.headers.get('content-type') || '';
    if (route.endsWith('.html') || route === '/') assert.match(type, /text\/html/i, route);
    if (route.endsWith('.json')) assert.match(type, /json/i, route);
    if (route.endsWith('.pdf')) { assert.match(type, /pdf|octet-stream/i); assert.equal((await r.arrayBuffer()).byteLength > 500, true); }
  }
});
test('los archivos internos no se exponen como contenido estático', async () => {
  for (const route of ['/server.js', '/package.json', '/lib/quizzes.js', '/tests/api.test.js', '/.env']) {
    const r = await request(route); assert.ok([403, 404].includes(r.status), `${route} no debe ser público`);
  }
});
test('el servidor rechaza métodos no permitidos para páginas', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
    const r = await request('/aula.html', { method }); assert.equal(r.status, 405, `${method} /aula.html`);
  }
});
test('una ruta API desconocida no filtra información a usuarios anónimos y responde 404 con sesión', async () => {
  const anonymous = await request('/api/ruta-que-no-existe'); const anonData = await anonymous.json();
  assert.equal(anonymous.status, 401); assert.match(anonData.error, /sesión/i);
  const login = await request('/api/register', { method: 'POST', headers: { origin: base }, body: { email: 'unknown-route@codigoclaro.test', password: 'PruebaSegura_2026!', name: 'Ruta desconocida', consent: true } });
  assert.equal(login.status, 201); const cookie = login.headers.get('set-cookie').split(';')[0];
  const authenticated = await request('/api/ruta-que-no-existe', { headers: { cookie } }); const data = await authenticated.json();
  assert.equal(authenticated.status, 404); assert.match(data.error, /Endpoint no encontrado/i);
});
test('los endpoints privados exigen autenticación', async () => {
  const me = await request('/api/me'); assert.equal(me.status, 200); assert.equal((await me.json()).user, null, '/api/me debe informar de sesión anónima sin error');
  for (const route of ['/api/progress', '/api/attempts', '/api/stats/topics', '/api/stats/overview', '/api/goals/weekly', '/api/study/sessions', '/api/reviews', '/api/activity', '/api/feedback/mine']) {
    const r = await request(route); assert.equal(r.status, 401, `${route} debe exigir sesión`);
  }
});
test('la API valida origen en peticiones de escritura', async () => {
  const r = await request('/api/feedback', { method: 'POST', body: { kind: 'idea', message: 'Prueba CSRF', rating: 4 }, headers: { origin: 'https://otro-dominio.invalid' } });
  assert.ok([400, 403].includes(r.status), `origen externo inesperado aceptado: ${r.status}`);
});
test('registro valida datos y no acepta contraseñas demasiado cortas', async () => {
  const r = await request('/api/register', { method: 'POST', headers: { origin: base }, body: { email: 'bad-email', password: '123', name: 'X', consent: true } });
  assert.equal(r.status, 400);
});
test('el banco de preguntas tiene IDs únicos, opciones suficientes y respuesta válida', () => {
  const bank = require('../lib/quizzes'); assert.ok(bank.length >= 80, `Banco esperado >=80; encontrado ${bank.length}`);
  const ids = bank.map(q => q.id); assert.equal(new Set(ids).size, ids.length, 'IDs duplicados');
  for (const q of bank) {
    assert.ok(typeof q.id === 'string' && q.id.length > 0);
    assert.ok(typeof q.q === 'string' && q.q.trim().length > 0, q.id);
    assert.ok(Array.isArray(q.o) && q.o.length >= 2 && q.o.length <= 8, q.id);
    assert.ok(Number.isInteger(q.a) && q.a >= 0 && q.a < q.o.length, `respuesta inválida: ${q.id}`);
    assert.ok(typeof q.e === 'string' && q.e.trim().length > 0, `falta explicación: ${q.id}`);
    if (q.difficulty !== undefined) assert.ok(['basic', 'intermediate', 'advanced'].includes(q.difficulty), `dificultad inválida: ${q.id}`);
  }
});
test('la guía de pruebas de Render es explícitamente de solo lectura', () => {
  const script = fs.readFileSync(path.join(__dirname, '../scripts/smoke-render.js'), 'utf8');
  assert.match(script, /method:\s*'GET'/); assert.match(script, /Solo usa GET/);
  assert.doesNotMatch(script, /method:\s*'(POST|PUT|PATCH|DELETE)'/);
  assert.match(script, /\/api\/health/); assert.match(script, /\/api\/catalog/); assert.match(script, /\/Java_Tema_01\.pdf/);
});
