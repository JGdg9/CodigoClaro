'use strict';

const fs = require('node:fs');
const path = require('node:path');

const PUBLIC = path.resolve(__dirname, '..', 'public');
const FALLBACK = {
  404: '<!doctype html><html lang="es"><meta charset="utf-8"><title>404 · CódigoClaro</title><body><h1>Página no encontrada</h1><a href="/">Volver al inicio</a></body></html>',
  500: '<!doctype html><html lang="es"><meta charset="utf-8"><title>500 · CódigoClaro</title><body><h1>No se pudo cargar la página</h1><a href="/">Volver al inicio</a></body></html>'
};

function acceptsHtml(req) {
  const accept = req.headers && req.headers.accept || '';
  return /(?:^|,)\s*(?:text\/html|application\/xhtml\+xml)(?:\s*[,;]|$)/i.test(String(accept));
}

function sendHtmlError(req, res, status) {
  if (status !== 404 && status !== 500) throw new RangeError('Código de error HTML no admitido.');
  let body = FALLBACK[status];
  try {
    body = fs.readFileSync(path.join(PUBLIC, String(status) + '.html'), 'utf8');
  } catch {}
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'same-origin',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(req.method === 'HEAD' ? '' : body);
}

module.exports = { acceptsHtml, sendHtmlError };
