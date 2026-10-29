'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildLocalQuestions, renderLocalQuestions } = require('../scripts/generar_banco_aula');

const root = path.join(__dirname, '..');
const aula = fs.readFileSync(path.join(root, 'public/aula.html'), 'utf8').replace(/\r\n/g, '\n');
const generatedAsset = fs.readFileSync(path.join(root, 'public/quiz-bank-expanded.js'), 'utf8').replace(/\r\n/g, '\n');
const baseMatch = aula.match(/const Q=(\[[\s\S]*?\]);\s*Q\.push/);
assert.ok(baseMatch, 'el aula debe conservar el banco inicial y cargar la ampliación después');
const base = vm.runInNewContext(baseMatch[1]);
const sandbox = { window: {} };
vm.runInNewContext(generatedAsset, sandbox);
const expansion = sandbox.window.CC_LOCAL_QUIZ_EXPANSION;
const combined = [...base, ...expansion];

test('el aula carga el banco generado y este coincide con sus fuentes', () => {
  assert.match(aula, /<script src="\.\/quiz-bank-expanded\.js"><\/script>/);
  assert.match(aula, /Q\.push\(\.\.\.\(window\.CC_LOCAL_QUIZ_EXPANSION\s*\|\|\s*\[\]\)\)/);
  assert.equal(JSON.stringify(expansion), JSON.stringify(buildLocalQuestions()));
  assert.equal(generatedAsset, renderLocalQuestions());
});

test('cada tecnología seleccionable del aula ofrece 20 preguntas únicas', () => {
  const categories = [
    'java', 'python', 'js', 'html', 'css', 'xml', 'sql', 'plsql', 'mongo',
    'react', 'node', 'hibernate', 'kotlin', 'git', 'api', 'security',
    'database', 'typescript', 'postgresql'
  ];
  for (const category of categories) {
    const questions = combined.filter(question => question[0] === category);
    const distinct = new Set(questions.map(question => question[1].trim().toLocaleLowerCase('es')));
    assert.ok(distinct.size >= 20, `${category} necesita 20 preguntas distintas; tiene ${distinct.size}`);
  }
});

test('cada pregunta tiene cuatro opciones válidas, una respuesta y explicación', () => {
  for (const [category, prompt, options, answer, explanation] of combined) {
    assert.equal(typeof category, 'string');
    assert.ok(category, 'categoría obligatoria');
    assert.equal(typeof prompt, 'string');
    assert.ok(prompt.trim(), 'enunciado obligatorio');
    assert.ok(Array.isArray(options), `${category}: ${prompt} debe usar un array de opciones`);
    assert.equal(options.length, 4, `${category}: ${prompt} debe tener cuatro opciones`);
    assert.ok(options.every(option => typeof option === 'string' && option.trim()), `${category}: ${prompt} debe tener cuatro opciones de texto no vacías`);
    assert.equal(new Set(options).size, 4, `${category}: ${prompt} debe tener opciones diferentes`);
    assert.ok(Number.isInteger(answer) && answer >= 0 && answer < options.length, `${category}: ${prompt} tiene índice de respuesta inválido`);
    assert.equal(typeof explanation, 'string');
    assert.ok(explanation.trim(), `${category}: ${prompt} necesita explicación`);
  }
});

test('los filtros agrupados y el test de 20 preguntas están disponibles en la interfaz', () => {
  const visibleFilters = [...aula.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]);
  for (const filter of ['typescript', 'postgresql', 'web', 'programacion']) {
    assert.ok(visibleFilters.includes(filter), `falta el filtro ${filter}`);
  }
  assert.match(aula, /<option>20<\/option>/);
  const web = combined.filter(question => ['html', 'css', 'js'].includes(question[0]));
  const programming = combined.filter(question => ['java', 'python', 'js'].includes(question[0]));
  assert.ok(web.length >= 20, 'el filtro Web debe poder crear un test de 20 preguntas');
  assert.ok(programming.length >= 20, 'el filtro Programación debe poder crear un test de 20 preguntas');
});
