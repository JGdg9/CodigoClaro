/** CódigoClaro — Comprueba la calidad estructural de páginas, catálogo, recursos y estilos editoriales. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const pub = path.join(root, 'public');

test('todas las páginas principales declaran idioma, viewport y título', () => {
  for (const name of ['index.html', 'aula.html', 'temarios.html', 'diagnostico.html', 'privacidad.html', 'condiciones.html', 'guia-temarios.html']) {
    const html = fs.readFileSync(path.join(pub, name), 'utf8');
    assert.match(html, /<html[^>]*lang="es"/i, `${name}: idioma español`);
    assert.match(html, /name="viewport"/i, `${name}: viewport responsive`);
    assert.match(html, /<title>[^<]+<\/title>/i, `${name}: título`);
  }
});
test('portal y aula comparten los tokens editoriales de Intercom', () => {
  for (const name of ['index.html', 'aula.html']) {
    const html = fs.readFileSync(path.join(pub, name), 'utf8');
    for (const token of ['#faf9f6', '#f1eee9', '#dedbd6', '#111111', '#0007cb']) assert.ok(html.toLowerCase().includes(token), `${name}: falta ${token}`);
    assert.match(html, /border-radius:\s*4px/i, `${name}: radio editorial de 4 px`);
    assert.match(html, /font-weight:\s*300/i, `${name}: titulares ligeros`);
  }
});
test('la hoja editorial no vuelve a activar sombras en los componentes principales', () => {
  const html = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  const start = html.lastIndexOf('/* CódigoClaro v1.3.0');
  assert.ok(start >= 0, 'debe existir la capa de tokens editorial');
  const editorial = html.slice(start);
  assert.match(editorial, /--shadow:\s*none/);
  assert.match(editorial, /\.hero-box,\.panel,\.card,\.stat,\.authbox\{[^}]*box-shadow:none/s);
  assert.match(editorial, /\.btn\.primary\{background:#000000;color:#ffffff/);
});
test('catálogo de 75 temas tiene datos consistentes y cada PDF existe', () => {
  const catalog = JSON.parse(fs.readFileSync(path.join(pub, 'catalogo_temas.json'), 'utf8'));
  assert.equal(catalog.length, 75);
  const tracks = new Map();
  for (const topic of catalog) {
    assert.ok(topic.track && topic.title && topic.description && topic.file, JSON.stringify(topic));
    tracks.set(topic.track, (tracks.get(topic.track) || 0) + 1);
    assert.ok(fs.existsSync(path.join(pub, 'temarios', topic.file)), `falta ${topic.file}`);
    assert.ok(fs.statSync(path.join(pub, 'temarios', topic.file)).size > 500, `${topic.file} está vacío`);
  }
  assert.deepEqual([...tracks.values()].sort((a,b)=>a-b), [15,15,15,15,15]);
});
test('los recursos de documentación y políticas se encuentran en el paquete', () => {
  for (const file of ['catalogo_temas.json', 'guia-temarios.html', 'privacidad.html', 'condiciones.html', 'diagnostico.html', 'aula.html', 'index.html', 'temarios.html']) {
    assert.ok(fs.existsSync(path.join(pub, file)), `falta public/${file}`);
  }
});
test('los scripts npm exponen pruebas normales, cobertura y smoke test remoto', () => {
  const pkg = require('../package.json');
  assert.match(pkg.scripts.test, /node --test/);
  assert.match(pkg.scripts['test:coverage'], /--experimental-test-coverage/);
  assert.match(pkg.scripts['test:render'], /smoke-render\.js/);
});
