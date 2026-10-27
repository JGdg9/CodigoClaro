#!/usr/bin/env node
/**
 * Smoke test HTTP de solo lectura para la instancia publicada en Render.
 * Comprueba respuestas y cabeceras de rutas públicas; no crea usuarios ni
 * modifica registros. Configurar RENDER_BASE_URL para probar staging.
 */
/** CódigoClaro — Comprueba rutas públicas de Render mediante solicitudes GET/HEAD. No crea cuentas ni modifica datos de la aplicación. */
'use strict';
/**
 * Smoke test read-only para una instancia publicada. Solo usa GET; no registra
 * usuarios ni modifica datos. Uso: RENDER_BASE_URL=https://... npm run test:render
 */
const BASE = (process.env.RENDER_BASE_URL || 'https://codigoclaro.onrender.com').replace(/\/+$/, '');
const TIMEOUT_MS = Number(process.env.RENDER_TIMEOUT_MS || 15000);
const RETRIES = Number(process.env.RENDER_RETRIES || 1);
const checks = [
  { path: '/', type: /text\/html/i, includes: /CódigoClaro|CodigoClaro/i, label: 'portada' },
  { path: '/aula.html', type: /text\/html/i, includes: /CódigoClaro|CodigoClaro/i, label: 'aula' },
  { path: '/temarios.html', type: /text\/html/i, includes: /temario|CódigoClaro/i, label: 'biblioteca de temarios' },
  { path: '/estudio.html', type: /text\/html/i, includes: /Espacio de estudio|Concentración/i, label: 'espacio de estudio' },
  { path: '/estudio.js', type: /javascript/i, includes: /normalizeState|formatTime/i, label: 'lógica del espacio de estudio' },
  { path: '/api/health', type: /application\/json/i, validate: x => x && x.ok === true && typeof x.version === 'string', label: 'API health' },
  { path: '/api/catalog', type: /application\/json/i, validate: x => x && Array.isArray(x.topics) && x.topics.length >= 1, label: 'catálogo API' },
  { path: '/api/learning/topics', type: /application\/json/i, validate: x => x && Array.isArray(x.topics) && x.topics.length >= 1, label: 'temas de aprendizaje API' },
  { path: '/catalogo_temas.json', type: /application\/json/i, validate: x => Array.isArray(x) && x.length >= 1, label: 'catálogo JSON público' },
  { path: '/temarios/Java_Tema_01.pdf', type: /application\/pdf|application\/octet-stream/i, bytes: 500, label: 'PDF de muestra' },
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
/** Comprueba una ruta pública y valida su estado HTTP y tipo de contenido. */
async function checkOne(check) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const response = await fetch(new URL(check.path, BASE), { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers: { 'user-agent': 'CodigoClaro-Render-SmokeTest/1.0', accept: '*/*' } });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (check.type && !check.type.test(contentType)) throw new Error(`Content-Type inesperado: ${contentType || '(vacío)'}`);
      if (check.bytes) {
        const data = await response.arrayBuffer();
        if (data.byteLength < check.bytes) throw new Error(`respuesta demasiado pequeña: ${data.byteLength} bytes`);
        if (check.path.endsWith('.pdf') && new TextDecoder().decode(data.slice(0, 5)) !== '%PDF-') throw new Error('el archivo no tiene cabecera PDF');
      } else if (check.type.test(contentType) && /json/i.test(contentType)) {
        let data;
        try { data = await response.json(); } catch { throw new Error('JSON inválido'); }
        if (check.validate && !check.validate(data)) throw new Error('estructura de respuesta no válida');
      } else {
        const body = await response.text();
        if (check.includes && !check.includes.test(body)) throw new Error('no se encontró el contenido esperado');
      }
      return { ok: true, label: check.label, status: response.status, ms: Math.round(Number(response.headers.get('server-timing-ms') || 0)) || null };
    } catch (error) {
      lastError = error;
      if (attempt < RETRIES) await sleep(1200 * (attempt + 1));
    }
  }
  return { ok: false, label: check.label, error: lastError?.message || 'error desconocido' };
}
(async () => {
  let parsed;
  try { parsed = new URL(BASE); } catch { console.error('RENDER_BASE_URL no es una URL válida.'); process.exit(2); }
  if (parsed.protocol !== 'https:' && parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
    console.error('Por seguridad, la URL de Render debe usar HTTPS.'); process.exit(2);
  }
  console.log(`Comprobación de solo lectura: ${BASE}`);
  console.log(`Rutas: ${checks.length}; reintentos por ruta: ${RETRIES}; timeout: ${TIMEOUT_MS} ms`);
  const results = [];
  // Solo 10 GET ligeros; en paralelo se reduce el tiempo total si Render no responde.
  const completed = await Promise.all(checks.map(checkOne));
  results.push(...completed);
  for (const result of results) console.log(`${result.ok ? 'OK' : 'FALLO'}  ${result.label}${result.status ? ` — HTTP ${result.status}` : ''}${result.error ? ` — ${result.error}` : ''}`);
  const failed = results.filter(r => !r.ok);
  console.log(`\nResultado: ${results.length - failed.length}/${results.length} comprobaciones correctas.`);
  if (failed.length) {
    console.error('No se ha modificado ningún dato. Revisa Render, el registro de despliegue y vuelve a ejecutar el test cuando el servicio esté activo.');
    process.exit(1);
  }
})().catch(error => { console.error(error); process.exit(1); });
