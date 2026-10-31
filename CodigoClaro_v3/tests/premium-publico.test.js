'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const publicDir = path.join(__dirname, '../public');
const html = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');

test('la propuesta pública conserva los planes y no muestra cálculos financieros', () => {
  const section = html.match(/<section id="premium"[\s\S]*?<\/section>/)?.[0];
  assert.ok(section, 'Debe existir la sección Premium');

  for (const price of ['0 €', '4,99 €', '9,99 €']) assert.ok(section.includes(price));
  assert.match(section, /Gratis/);
  assert.match(section, /Estudiante/);
  assert.match(section, /Intensivo/);
  assert.match(section, /no están activos/);
  assert.match(section, /aún no se pueden contratar/);
  assert.doesNotMatch(section, /margen|beneficio neto|rentabilidad|Stripe|OpenAI|tokens|USD|costes variables/i);
  assert.doesNotMatch(html, /premium-precios\.js|premiumMargin|premiumEstimate/);
  assert.equal(fs.existsSync(path.join(publicDir, 'premium-precios.js')), false);
});
