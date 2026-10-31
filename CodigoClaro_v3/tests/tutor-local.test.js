'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const tutor = require('../public/tutor-local');

const courses = [
  ['java', 'Java', 'Programación', '', [
    ['Control de flujo', 'Tipos y condiciones.', 'int edad = 20;'],
    ['POO y colecciones', 'Clases y colecciones.', 'List<String> nombres = new ArrayList<>();']
  ]],
  ['sql', 'SQL y MySQL', 'Bases de datos', '', [
    ['JOIN y agregación', 'JOIN combina tablas; GROUP BY agrupa.', 'SELECT ...'],
    ['Modelo y transacciones', 'Las transacciones agrupan cambios.', 'BEGIN; COMMIT;']
  ]],
  ['python', 'Python', 'Programación', '', [['Colecciones', 'Listas y diccionarios.', 'notas = [7, 9]']]]
];

test('el tutor responde sobre conceptos locales y enlaza el tema relacionado', () => {
  const results = tutor.search('¿Qué tipos primitivos tiene Java?', { courses, exercises: [], questions: [] });
  assert.equal(results[0].id, 'java-primitives');
  assert.equal(results[0].sourceCourseId, 'java');
  assert.equal(results[0].sourceTopicTitle, 'Control de flujo');
  assert.match(tutor.formatAnswer(results[0], '¿Qué tipos primitivos tiene Java?'), /ocho tipos primitivos/);
});

test('las consultas de contraste y de pasos producen respuestas deterministas', () => {
  const join = tutor.search('diferencia entre INNER JOIN y LEFT JOIN', { courses, exercises: [], questions: [] })[0];
  assert.equal(join.id, 'sql-joins');
  assert.match(tutor.formatAnswer(join, 'diferencia entre INNER JOIN y LEFT JOIN'), /Diferencia clave:/);

  const steps = tutor.search('pasos para elegir una lista o un diccionario en Python', { courses, exercises: [], questions: [] })[0];
  assert.equal(steps.id, 'python-collections');
  assert.match(tutor.formatAnswer(steps, 'pasos para elegir una lista o un diccionario en Python'), /1\./);
});

test('el banco local amplía la búsqueda sin mostrar la opción correcta del test', () => {
  const questions = [['java', '¿Qué colección evita duplicados?', ['ArrayList', 'HashSet', 'HashMap', 'String'], 1, 'HashSet conserva valores únicos.']];
  const results = tutor.search('HashSet colección Java', { courses, exercises: [], questions });
  const answer = results.find(item => item.kind === 'quiz');
  assert.ok(answer);
  assert.match(tutor.formatAnswer(answer, 'HashSet colección Java'), /conserva valores únicos/);
  assert.doesNotMatch(tutor.formatAnswer(answer, 'HashSet colección Java'), /ArrayList|HashMap/);
  assert.equal(answer.sourceCourseId, 'java');
});

test('las prácticas ofrecen pistas graduadas y no la solución de golpe', () => {
  const exercise = [
    'python', 'Python · sumar lista', 'Suma los elementos de una lista.', 'def sumar(numeros):',
    [['define función', /def/], ['devuelve suma', /return/]], 'def sumar(numeros): return sum(numeros)', 'Usa un acumulador o la función sum.'
  ];
  const index = tutor.buildIndex([], [exercise], [], []);
  assert.equal(index[0].hints.length, 3);
  assert.match(index[0].hints[0], /sum/);
  assert.match(index[0].hints[1], /define función/);
  assert.doesNotMatch(index[0].hints.join(' '), /return sum\(numeros\)/);
  const result = tutor.search('dame una pista para sumar una lista en Python', { courses, exercises: [exercise], questions: [] });
  assert.equal(result[0].kind, 'exercise');
  assert.equal(result[0].title, exercise[1]);
});

test('las CTE no recursivas se explican y las búsquedas sin cobertura no inventan una respuesta', () => {
  const cte = tutor.search('¿Qué es una CTE en SQL?', { courses, exercises: [], questions: [] })[0];
  assert.equal(cte.id, 'sql-cte');
  assert.match(cte.answer, /una única sentencia/);
  assert.deepEqual(tutor.search('quién ganará el partido mañana', { courses: [], exercises: [], questions: [] }), []);
});

test('la ayuda de ejecución refleja el motor activo en vez de duplicar capacidades', () => {
  const answer = tutor.runtimeAnswer('¿Cómo ejecuto React?', {
    id: 'react', label: 'React', description: 'React/JSX genera una vista previa estática en un worker local; el código no se transmite. Los eventos, efectos y scripts no se ejecutan.'
  }, [{ id: 'react', label: 'React' }]);
  assert.match(answer, /vista previa estática en un worker local/);
  assert.match(answer, /eventos, efectos y scripts no se ejecutan/);
  assert.doesNotMatch(answer, /Babel|iframe/);
});

test('el tutor declara su alcance local y no persiste ni transmite preguntas', () => {
  const source = fs.readFileSync(path.join(__dirname, '../public/tutor-local.js'), 'utf8');
  assert.match(source, /toggle\.textContent = 'Tutor local'/);
  assert.match(source, /title\.textContent = 'Tutor local de estudio'/);
  assert.match(source, /no es IA generativa/i);
  assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage)\b/);
  assert.match(source, /paragraph\.textContent\s*=\s*text/);
});
