'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { buildCorpus } = require('../scripts/generar_tutor_conocimiento');
const tutor = require('../public/tutor-local');

const root = path.join(__dirname, '..');
const source = JSON.parse(fs.readFileSync(path.join(root, 'scripts/temarios_contenido.json'), 'utf8'));
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'docs/catalogo_temas.json'), 'utf8'));
const corpus = buildCorpus(source, catalog, path.join(root, 'public'));

test('el corpus enriquecido contiene los 75 temas, sus prácticas, fuentes y PDF', () => {
  assert.equal(corpus.length, 75);
  const counts = Object.groupBy(corpus, item => item.track);
  assert.deepEqual(Object.fromEntries(Object.entries(counts).map(([track, topics]) => [track, topics.length])), {
    Python: 15, Java: 15, JavaScript: 15, Kotlin: 15, React: 15
  });

  for (const topic of corpus) {
    assert.ok(topic.explanation && topic.example && topic.output);
    assert.ok(topic.mistakes.length > 0);
    assert.ok(topic.exercise.statement && topic.exercise.cases.length > 0 && topic.exercise.solution);
    assert.ok(topic.sources.length > 0 && topic.sources.every(sourceItem => sourceItem.url.startsWith('https://')));
    assert.ok(fs.existsSync(path.join(root, 'public', topic.pdfPath.replace(/^\//, ''))), topic.pdfPath);
  }
});

test('el aula carga el tutor y el corpus desde rutas locales de la misma carpeta', () => {
  const aula = fs.readFileSync(path.join(root, 'public/aula.html'), 'utf8');
  const tutorSource = fs.readFileSync(path.join(root, 'public/tutor-local.js'), 'utf8');
  const builtAsset = require('../public/tutor-conocimiento');

  assert.match(aula, /<script src="\.\/tutor-local\.js"><\/script>/);
  assert.match(tutorSource, /new window\.URL\('\.\/tutor-conocimiento\.js', window\.location\.href\)/);
  assert.match(tutorSource, /url\.origin !== window\.location\.origin/);
  assert.equal(builtAsset.length, 75);
  assert.deepEqual(builtAsset, corpus);
});

test('la búsqueda indexa los temas y conserva el PDF cuando no existe una lección del aula', () => {
  const results = tutor.search('Python REPL pip venv', {
    courses: [], exercises: [], questions: [], richTopics: corpus
  });
  const result = results.find(item => item.id === 'python-01');
  assert.ok(result);
  assert.equal(result.sourceCourseId, undefined);
  assert.equal(result.pdfPath, '/temarios/Python_Tema_01.pdf');

  const javaTopic = corpus.find(item => item.track === 'Java' && item.title === 'Variables y tipos');
  const courses = [['java', 'Java', 'Programación', '', [['Variables', 'Declaración y asignación.', 'int edad = 20;']]]];
  const linked = tutor.buildIndex(courses, [], [], [], [javaTopic])[0];
  assert.equal(linked.sourceCourseId, 'java');
  assert.equal(linked.sourceTopicIndex, 0);
});

test('los enlaces del corpus apuntan a lecciones reales y los demás conservan el PDF', () => {
  const aula = fs.readFileSync(path.join(root, 'public/aula.html'), 'utf8');
  const catalogMatch = aula.match(/const C=(\[[\s\S]*?\]);/);
  assert.ok(catalogMatch, 'el aula debe declarar su catálogo de lecciones');
  const courses = vm.runInNewContext(catalogMatch[1]);
  const resolve = (track, title) => {
    const topic = corpus.find(item => item.track === track && item.title === title);
    assert.ok(topic, `falta ${track} · ${title} en el corpus`);
    return tutor.buildIndex(courses, [], [], [], [topic]).find(item => item.kind === 'rich');
  };

  const expectedLessons = [
    ['Python', 'Bucles', 'Sintaxis'],
    ['Python', 'Listas y tuplas', 'Colecciones'],
    ['Python', 'Diccionarios y conjuntos', 'Colecciones'],
    ['Python', 'Comprensiones y generadores', 'Colecciones'],
    ['Python', 'Ficheros y JSON', 'Archivos'],
    ['Java', 'Condicionales', 'Control de flujo'],
    ['Java', 'Clases y objetos', 'POO y colecciones'],
    ['Java', 'Constructores y this', 'POO y colecciones'],
    ['Java', 'Herencia y polimorfismo', 'POO y colecciones'],
    ['Java', 'Interfaces y abstractas', 'POO y colecciones'],
    ['JavaScript', 'Tipos y coerción', 'Variables'],
    ['React', 'Props', 'Componentes'],
    ['React', 'Eventos y formularios', 'Efectos']
  ];
  for (const [track, title, lesson] of expectedLessons) {
    assert.equal(resolve(track, title).sourceTopicTitle, lesson, `${track} · ${title}`);
  }

  const kotlin = resolve('Kotlin', 'Primer programa Kotlin');
  assert.equal(kotlin.sourceCourseId, undefined);
  assert.equal(kotlin.pdfPath, '/temarios/Kotlin_Tema_01.pdf');
});

test('las preguntas de seguimiento muestran el campo pedido y reservan la solución al botón', () => {
  const topic = corpus.find(item => item.track === 'JavaScript' && item.exercise.solution);
  const item = tutor.buildIndex([], [], [], [], [topic])[0];
  tutor.formatAnswer(item, `${topic.track} ${topic.title}`);
  const context = { item, hintState: { index: 0 } };

  const output = tutor.followUpAnswer(context, '¿Y la salida?');
  assert.equal(output.item.showOutput, true);
  assert.equal(output.item.showExample, false);

  const example = tutor.followUpAnswer(context, '¿Y el ejemplo?');
  assert.equal(example.item.showExample, true);
  assert.equal(example.item.showOutput, false);

  const practice = tutor.followUpAnswer(context, '¿Y la práctica?');
  assert.equal(practice.item.showPractice, true);
  assert.equal(practice.item.showExample, false);
  assert.equal(practice.item.showOutput, false);

  const hint = tutor.followUpAnswer(context, 'dame una pista');
  assert.match(hint.text, /Pista 1 de/);
  assert.equal(context.hintState.index, 1);

  const solution = tutor.followUpAnswer(context, 'solución');
  assert.equal(solution.item.showSolutionButton, true);
  assert.equal(solution.text.includes(topic.exercise.solution), false);

  assert.equal(tutor.followUpAnswer(context, '¿Y los errores comunes en Java?'), null);
});
