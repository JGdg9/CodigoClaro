/** CódigoClaro — Verifica que el smoke test de Render es de solo lectura y maneja respuestas HTTP esperadas. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

test('el smoke test comprueba rutas y tipos de contenido sin escribir datos', async () => {
  const server = http.createServer((req, res) => {
    const send = (status, type, body) => { res.writeHead(status, { 'content-type': type }); res.end(body); };
    if (req.method !== 'GET') return send(405, 'text/plain', 'solo GET');
    if (req.url === '/' || ['/aula.html','/temarios.html'].includes(req.url)) return send(200, 'text/html; charset=utf-8', '<!doctype html><html><title>CódigoClaro</title><body>Temarios CódigoClaro</body></html>');
    if (req.url === '/estudio.html') return send(200, 'text/html; charset=utf-8', '<!doctype html><html><title>Espacio de estudio</title><body>Concentración</body></html>');
    if (req.url === '/estudio.js') return send(200, 'application/javascript; charset=utf-8', 'function normalizeState(){} function formatTime(){}');
    if (req.url === '/api/health') return send(200, 'application/json', JSON.stringify({ok:true,version:'test'}));
    if (req.url === '/api/catalog') return send(200, 'application/json', JSON.stringify({topics:[{title:'Java'}]}));
    if (req.url === '/api/learning/topics') return send(200, 'application/json', JSON.stringify({topics:[{name:'Java'}]}));
    if (req.url === '/catalogo_temas.json') return send(200, 'application/json', JSON.stringify([{track:'Java'}]));
    if (req.url === '/temarios/Java_Tema_01.pdf') return send(200, 'application/pdf', Buffer.concat([Buffer.from('%PDF-'), Buffer.alloc(600)]));
    return send(404, 'text/plain', 'no encontrado');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const child = spawn(process.execPath, [path.join(__dirname, '../scripts/smoke-render.js')], { env: {...process.env, RENDER_BASE_URL:base, RENDER_RETRIES:'0', RENDER_TIMEOUT_MS:'1000'}, stdio:['ignore','pipe','pipe'] });
    let out='', err=''; child.stdout.on('data', x => out += x); child.stderr.on('data', x => err += x);
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve); });
    assert.equal(code, 0, `${out}\n${err}`); assert.match(out, /10\/10 comprobaciones correctas/); assert.match(out, /API health/);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
