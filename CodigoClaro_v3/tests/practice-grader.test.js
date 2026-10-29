"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadExercises() {
  const html = fs.readFileSync(require.resolve("../public/aula.html"), "utf8");
  const start = html.indexOf("const E=[");
  const end = html.indexOf("\n];", start) + 2;
  assert.ok(start >= 0 && end > start);
  const result = vm.runInNewContext(html.slice(start, end) + ";E");
  return result.map(item => { item[4] = item[4].map(([label, rule]) => [label, new RegExp(rule.source, rule.flags)]); return item; });
}

function runWorker(source, payload) {
  let response;
  const self = {};
  vm.runInNewContext(source, {self, Object, JSON, RegExp, Math, Array, Promise, Function});
  self.onmessage({data:payload,ports:[{postMessage(message) { response = message; }}]});
  if (!response || response.ok === false) throw new Error(response && response.error || "El worker no devolvió datos.");
  return response.value;
}

const previousSandbox = globalThis.CCSandbox;
let calls = [];
globalThis.CCSandbox = {
  run: async function (source, payload, options) {
    calls.push({source, payload, options});
    return runWorker(source, payload);
  }
};
const grader = require("../public/practice-grader.js");
const exercises = loadExercises();

function createSqlFixture(results) {
  return {
    run() {},
    close() {},
    exec(query) {
      if (/count\s*\(/i.test(query)) return results.counts;
      if (/not\s+exists/i.test(query)) return results.unborrowed;
      return results.active;
    }
  };
}

test("JavaScript acepta un bucle alternativo al método filter y prueba todos los casos", async () => {
  calls = [];
  const exercise = exercises.find(item => item[1] === "JavaScript · filtrar aprobados");
  const report = await grader.grade(exercise, "const aprobadas = []; for (const nota of notas) { if (nota >= 5) aprobadas.push(nota); }");
  assert.equal(report.mode, "behavioral");
  assert.equal(report.percent, 100);
  assert.deepEqual(report.cases.map(item => item.passed), [true, true, true, true]);
  assert.equal(calls.length, 1, "todos los casos comparten un límite de tiempo total");
  assert.equal(calls[0].options.timeoutMs, 5000);
});

test("JavaScript acepta otro algoritmo válido para contar frecuencias", async () => {
  const exercise = exercises.find(item => item[1] === "JavaScript · contar frecuencias");
  const answer = "const frecuencia = {}; for (const palabra of palabras) { frecuencia[palabra] = (frecuencia[palabra] || 0) + 1; }";
  const report = await grader.grade(exercise, answer);
  assert.equal(report.percent, 100);
  assert.deepEqual(report.cases.map(item => item.passed), [true, true, true]);
});

test("Python no se envía a un runtime ni se presenta como evaluación de comportamiento", async () => {
  calls = [];
  const exercise = exercises.find(item => item[1] === "Python · máximo de una lista");
  const report = await grader.grade(exercise, "def maximo(numeros):\n    return max(numeros)");
  assert.equal(report.mode, "structural-only");
  assert.equal(report.executed, false);
  assert.equal(report.behaviorPercent, null);
  assert.match(report.message, /ni envía tu código/i);
  assert.equal(calls.length, 0);
});

test("un ejercicio sin runtime mantiene la evaluación estructural explicada", async () => {
  const exercise = exercises.find(item => item[1] === "Java · suma de dos números");
  const report = await grader.grade(exercise, "static int sumar(int a, int b) { return a + b; }");
  assert.equal(report.mode, "structural-only");
  assert.equal(report.executed, false);
  assert.equal(report.percent, 100);
  assert.match(report.message, /no se envía código/i);
});

test("las consultas SQL de la biblioteca aceptan JOIN, agrupación y NOT EXISTS con sus resultados correctos", () => {
  const results = {
    active:[{columns:["prestamo_id","titulo","nombre"],values:[[2,"SQL","Ana"],[3,"Kotlin","Luis"]]}],
    counts:[{columns:["nombre","num_prestamos"],values:[["Ana",2],["Luis",2],["Marta",0]]}],
    unborrowed:[{columns:["titulo"],values:[["XML"]]}]
  };
  const report = grader.gradeSqlAssignment({
    active:"SELECT p.id AS prestamo_id, l.titulo, u.nombre FROM prestamos p LEFT JOIN libros l ON l.id=p.libro_id LEFT JOIN usuarios u ON u.id=p.usuario_id WHERE p.fecha_devolucion IS NULL",
    counts:"SELECT u.nombre, COUNT(p.id) AS num_prestamos FROM usuarios u LEFT JOIN prestamos p ON p.usuario_id=u.id GROUP BY u.id",
    unborrowed:"SELECT l.titulo FROM libros l WHERE NOT EXISTS (SELECT 1 FROM prestamos p WHERE p.libro_id=l.id)"
  }, () => createSqlFixture(results));
  assert.equal(report.percent, 100);
  assert.equal(report.executed, true);
  assert.deepEqual(report.tests.map(item => item.passed), [true,true,true]);
});

test("el corrector SQL señala resultados incorrectos y no ejecuta CTE o sentencias de escritura", () => {
  let executed = 0;
  const fixture = {
    run() {}, close() {},
    exec(query) {
      executed++;
      if (/count\s*\(/i.test(query)) return [{columns:["usuario_id","total"],values:[[1,2],[2,1],[3,0]]}];
      if (/not\s+exists/i.test(query)) return [{columns:["id"],values:[[4]]}];
      return [{columns:["libro_id"],values:[[2],[3]]}];
    }
  };
  const report = grader.gradeSqlAssignment({
    active:"SELECT libro_id FROM prestamos WHERE fecha_devolucion IS NULL",
    counts:"SELECT usuario_id, COUNT(*) AS total FROM prestamos GROUP BY usuario_id",
    unborrowed:"WITH libros_sin AS (SELECT id FROM libros) SELECT id FROM libros_sin"
  }, () => fixture);
  assert.equal(report.percent, 33);
  assert.equal(report.tests[0].passed, true);
  assert.match(report.tests[1].message, /cantidades correctas|Marta/i);
  assert.equal(report.tests[2].passed, false);
  assert.match(report.tests[2].message, /SELECT sin comentarios, CTE/i);
  assert.equal(executed, 2);
});

test("las consultas SQL con funciones costosas o demasiadas uniones se rechazan antes de ejecutar", () => {
  let executed = 0;
  const fixture = {run() {}, close() {}, exec() { executed++; return []; }};
  const report = grader.gradeSqlAssignment({
    active:"SELECT p.id FROM prestamos p JOIN libros l ON l.id=p.libro_id JOIN usuarios u ON u.id=p.usuario_id JOIN usuarios u2 ON u2.id=u.id",
    counts:"SELECT usuario_id, COUNT(*) AS loan_count FROM prestamos GROUP BY usuario_id UNION SELECT usuario_id, COUNT(*) FROM prestamos GROUP BY usuario_id UNION SELECT usuario_id, COUNT(*) FROM prestamos GROUP BY usuario_id UNION SELECT usuario_id, COUNT(*) FROM prestamos GROUP BY usuario_id",
    unborrowed:"SELECT printf('%1000000000s','x')"
  }, () => fixture);
  assert.equal(report.tests.every(item => !item.passed), true);
  assert.equal(executed, 0);
});

test("el corrector SQL limita la anidación y el número de subconsultas antes de ejecutar", () => {
  let executed = 0;
  const fixture = {run() {}, close() {}, exec() { executed++; return []; }};
  const report = grader.gradeSqlAssignment({
    active:"SELECT (((((((((((((1)))))))))))))",
    counts:"SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4",
    unborrowed:"SELECT 1"
  }, () => fixture);
  assert.equal(report.tests.every(item => !item.passed), true);
  assert.match(report.tests[0].message, /límite de anidamiento/i);
  assert.match(report.tests[1].message, /límite de anidamiento/i);
  assert.equal(executed, 1, "solo la consulta simple debe alcanzar SQLite");
});

test("el corrector SQL acepta alias habituales en inglés", () => {
  const results = {
    active:[{columns:["loan_id","book_title","borrower_name"],values:[[2,"SQL","Ana"],[3,"Kotlin","Luis"]]}],
    counts:[{columns:["user_id","loan_count"],values:[[1,2],[2,2],[3,0]]}],
    unborrowed:[{columns:["book_title"],values:[["XML"]]}]
  };
  const report = grader.gradeSqlAssignment({
    active:"SELECT p.id AS loan_id,l.titulo AS book_title,u.nombre AS borrower_name FROM prestamos p JOIN libros l ON l.id=p.libro_id JOIN usuarios u ON u.id=p.usuario_id WHERE p.fecha_devolucion IS NULL",
    counts:"SELECT u.id AS user_id,COUNT(p.id) AS loan_count FROM usuarios u LEFT JOIN prestamos p ON p.usuario_id=u.id GROUP BY u.id",
    unborrowed:"SELECT l.titulo AS book_title FROM libros l WHERE NOT EXISTS(SELECT 1 FROM prestamos p WHERE p.libro_id=l.id)"
  }, () => createSqlFixture(results));
  assert.equal(report.percent, 100);
  assert.deepEqual(report.tests.map(item => item.passed), [true,true,true]);
});

test.after(() => {
  if (previousSandbox === undefined) delete globalThis.CCSandbox;
  else globalThis.CCSandbox = previousSandbox;
});
