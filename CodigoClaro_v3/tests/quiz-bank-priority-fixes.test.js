'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const quizzes = require('../lib/quizzes');
const { buildLocalQuestions, renderLocalQuestions } = require('../scripts/generar_banco_aula');

const root = path.join(__dirname, '..');
const aula = fs.readFileSync(path.join(root, 'public/aula.html'), 'utf8');
const baseMatch = aula.match(/const Q=(\[[\s\S]*?\]);\s*Q\.push/);
assert.ok(baseMatch, 'el Aula debe conservar su banco base');
const base = vm.runInNewContext(baseMatch[1]);
const expansion = buildLocalQuestions();
const combined = [...base, ...expansion];

function normalizePrompt(prompt) {
  return prompt.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/\s+/g, ' ').trim();
}

test('la pregunta Java explica que el override puede omitir excepciones comprobadas', () => {
  const question = quizzes.find(item => item.q.startsWith('Una subclase sobrescribe un método'));
  assert.ok(question);
  assert.match(question.o[question.a], /Ninguna/);
  assert.match(question.e, /puede omitir/i);
  assert.match(question.e, /subtipos/i);
});

test('la pregunta de cursores exige un orden estable con clave única', () => {
  const question = quizzes.find(item => item.q.startsWith('¿Qué ventaja ofrece una paginación por cursor'));
  assert.ok(question);
  assert.match(question.o[question.a], /ordenación estable con clave única/i);
  assert.match(question.e, /clave única/i);
});

test('el generador quita duplicados del asset y conserva visibles las limitaciones del banco base', () => {
  const prompts = new Map();
  for (const [category, prompt] of combined) {
    const key = normalizePrompt(prompt);
    if (!prompts.has(key)) prompts.set(key, new Set());
    prompts.get(key).add(category);
  }
  const repeated = [...prompts.values()].filter(categories => categories.size > 1);
  assert.equal(repeated.length, 21);
  assert.ok(repeated.every(categories => categories.size === 2 && (
    (categories.has('html') && categories.has('css')) ||
    (categories.has('sql') && categories.has('database'))
  )));

  const categories = [
    'java', 'python', 'js', 'html', 'css', 'xml', 'sql', 'plsql', 'mongo',
    'react', 'node', 'hibernate', 'kotlin', 'git', 'api', 'security',
    'database', 'typescript', 'postgresql'
  ];
  for (const category of categories) {
    const questions = combined.filter(question => question[0] === category);
    const prompts = questions.map(question => normalizePrompt(question[1]));
    const distinct = new Set(prompts);
    assert.ok(distinct.size >= 20, `${category} necesita 20 preguntas distintas; tiene ${distinct.size}`);
    assert.equal(distinct.size, prompts.length, `${category} aún contiene preguntas repetidas dentro del filtro`);
  }
});

test('el asset generado coincide con la fuente actual', () => {
  const asset = fs.readFileSync(path.join(root, 'public/quiz-bank-expanded.js'), 'utf8');
  assert.equal(asset, renderLocalQuestions());
  assert.equal(JSON.stringify(expansion), JSON.stringify(buildLocalQuestions()));
});
