/** Comprueba el inventario y los enlaces documentales públicos. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('el único archivo .txt es requirements-docs.txt', () => {
  const repositoryRoot = path.resolve(root, '..');
  const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: repositoryRoot
  }).toString('utf8').split('\0').filter(Boolean).map(file => file.replace(/\\/g, '/'));
  const textFiles = tracked.filter(file => file.toLowerCase().endsWith('.txt')).sort();
  assert.deepEqual(textFiles, ['CodigoClaro_v3/requirements-docs.txt']);
});

test('las páginas HTML no enlazan a documentos locales inexistentes', () => {
  const publicRoot = path.join(root, 'public');
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
  const brokenLinks = [];
  for (const file of walk(publicRoot).filter(file => file.toLowerCase().endsWith('.html'))) {
    const markup = fs.readFileSync(file, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '');
    for (const match of markup.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)) {
      const reference = match[2].trim();
      const documentPath = reference.split(/[?#]/, 1)[0];
      if (!documentPath || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(documentPath)) continue;
      if (!/\.(?:md|txt)$/i.test(documentPath)) continue;
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(documentPath);
      } catch {
        brokenLinks.push({ from: path.relative(publicRoot, file), href: reference });
        continue;
      }
      const target = decodedPath.startsWith('/')
        ? path.resolve(publicRoot, '.' + decodedPath)
        : path.resolve(path.dirname(file), decodedPath);
      const relative = path.relative(publicRoot, target);
      if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || !fs.existsSync(target)) {
        brokenLinks.push({ from: path.relative(publicRoot, file), href: reference });
      }
    }
  }
  assert.deepEqual(brokenLinks, []);
});

test('la página de privacidad no mantiene campos de contacto pendientes', () => {
  const privacy = fs.readFileSync(path.join(root, 'public/privacidad.html'), 'utf8');
  assert.match(privacy, /CódigoClaro gestiona los datos/);
  assert.doesNotMatch(privacy, /\[(?:sustituir|añadir|completar)[^\]]*\]/i);
  assert.doesNotMatch(privacy, /@/);
});
