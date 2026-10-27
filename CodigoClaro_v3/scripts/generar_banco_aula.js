'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const quizzes = require('../lib/quizzes');
const localExtra = require('../lib/quizzes-local-extra');

const categoriesByTopic = {
  Java: ['java'],
  JavaScript: ['js'],
  Python: ['python'],
  SQL: ['sql'],
  'HTML/CSS': ['html', 'css'],
  React: ['react'],
  'Node.js': ['node'],
  'Bases de datos': ['database'],
  'PL/SQL': ['plsql'],
  Git: ['git'],
  APIs: ['api'],
  Seguridad: ['security'],
  MongoDB: ['mongo'],
  Kotlin: ['kotlin'],
  TypeScript: ['typescript'],
  PostgreSQL: ['postgresql'],
  'XML y XPath': ['xml'],
  Hibernate: ['hibernate']
};

function toLocalQuestion(question, category) {
  return [category, question.q, question.o, question.a, question.e];
}

function buildLocalQuestions() {
  const all = [...quizzes, ...localExtra];
  const expanded = [];
  const unmappedTopics = new Set();

  for (const question of all) {
    const categories = categoriesByTopic[question.topic];
    if (!categories) {
      unmappedTopics.add(question.topic);
      continue;
    }
    for (const category of categories) expanded.push(toLocalQuestion(question, category));
  }

  if (unmappedTopics.size) {
    throw new Error(`Faltan categorías del aula para: ${[...unmappedTopics].join(', ')}`);
  }

  const aulaPath = path.join(__dirname, '..', 'public', 'aula.html');
  const aula = fs.readFileSync(aulaPath, 'utf8');
  const baseMatch = aula.match(/const Q=(\[[\s\S]*?\]);\s*Q\.push/);
  if (!baseMatch) throw new Error('No se pudo leer el banco inicial Q del aula');
  const baseQuestions = vm.runInNewContext(baseMatch[1]);
  const combined = [...baseQuestions, ...expanded];

  const requiredCategories = Object.values(categoriesByTopic).flat();
  for (const category of requiredCategories) {
    const questions = combined.filter(question => question[0] === category);
    const distinct = new Set(questions.map(question => question[1].trim()));
    if (distinct.size < 20) {
      throw new Error(`${category} necesita 20 preguntas distintas; tiene ${distinct.size}`);
    }
  }
  return expanded;
}

function renderLocalQuestions(questions = buildLocalQuestions()) {
  return `/* Banco estático generado desde lib/quizzes.js y lib/quizzes-local-extra.js. */\n` +
    `window.CC_LOCAL_QUIZ_EXPANSION = ${JSON.stringify(questions)};\n`;
}

function writeLocalQuestions() {
  const destination = path.join(__dirname, '..', 'public', 'quiz-bank-expanded.js');
  const questions = buildLocalQuestions();
  fs.writeFileSync(destination, renderLocalQuestions(questions), 'utf8');
  return { destination, count: questions.length };
}

if (require.main === module) {
  const result = writeLocalQuestions();
  process.stdout.write(`Banco del aula generado: ${result.count} preguntas en ${result.destination}\n`);
}

module.exports = { buildLocalQuestions, renderLocalQuestions, writeLocalQuestions };
