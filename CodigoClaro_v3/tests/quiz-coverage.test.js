/** Comprueba la cobertura mínima y la calidad estructural del banco de cuestionarios. */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const questions = require('../lib/quizzes');

test('cada tecnología ofrece al menos 20 preguntas diferentes y válidas', () => {
  const technologies = [
    'Java', 'JavaScript', 'Python', 'SQL', 'HTML/CSS', 'React', 'Node.js',
    'Bases de datos', 'PL/SQL', 'Git', 'APIs', 'Seguridad', 'MongoDB',
    'Kotlin', 'TypeScript', 'PostgreSQL'
  ];
  const allIds = new Set();

  for (const technology of technologies) {
    const bank = questions.filter(question => question.topic === technology);
    assert.ok(bank.length >= 20, technology + ' tiene ' + bank.length + ' preguntas; se requieren al menos 20');
    assert.equal(new Set(bank.map(question => question.q.trim())).size, bank.length, technology + ': hay preguntas repetidas');
    assert.ok(
      ['basic', 'intermediate', 'advanced'].every(level => bank.some(question => question.difficulty === level)),
      technology + ': el banco debe incluir dificultad básica, intermedia y avanzada'
    );

    for (const question of bank) {
      assert.ok(question.id && !allIds.has(question.id), 'identificador vacío o repetido: ' + question.id);
      allIds.add(question.id);
      assert.equal(typeof question.q, 'string', question.id + ': el enunciado debe ser texto');
      assert.ok(question.q.trim().length > 0, question.id + ': pregunta vacía');
      assert.ok(Array.isArray(question.o), question.id + ': las opciones deben ser un array');
      assert.equal(question.o.length, 4, question.id + ': se esperan cuatro opciones');
      assert.ok(question.o.every(option => typeof option === 'string' && option.trim().length > 0), question.id + ': las opciones deben ser textos no vacíos');
      assert.equal(new Set(question.o).size, 4, question.id + ': las opciones deben ser distintas');
      assert.ok(Number.isInteger(question.a) && question.a >= 0 && question.a < question.o.length, question.id + ': respuesta fuera de rango');
      assert.equal(typeof question.e, 'string', question.id + ': la explicación debe ser texto');
      assert.ok(question.e.trim().length > 0, question.id + ': falta explicación');
    }
  }
});
