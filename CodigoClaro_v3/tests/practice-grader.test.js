"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { DatabaseSync } = require("node:sqlite");

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
      if (/not\s+exists|\bwith\b/i.test(query)) return results.unborrowed;
      return results.active;
    }
  };
}

function createMemorySqlite() {
  const database = new DatabaseSync(":memory:");
  return {
    run(statement) { database.exec(statement); },
    exec(query) {
      const statement = database.prepare(query);
      const columns = statement.columns().map(item => item.name);
      const rows = statement.all();
      return [{ columns, values: rows.map(row => columns.map(column => row[column])) }];
    },
    close() { database.close(); }
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

test("las prácticas SQL aceptan consultas equivalentes y comprueban datos distintos en cada caso", async () => {
  const approved = exercises.find(item => item[1] === "SQL · listar aprobados");
  const averages = exercises.find(item => item[1] === "SQL · media por curso");
  const noOrders = exercises.find(item => item[1] === "SQL · detectar registros sin relación");

  assert.equal(grader.requiresSqlDatabase(approved), true);
  const approvedReport = await grader.grade(approved,
    "WITH notas_validas AS (SELECT nombre, nota FROM alumnos WHERE nota BETWEEN 5 AND 10) SELECT nombre, nota FROM notas_validas ORDER BY nota DESC",
    {createDatabase:createMemorySqlite});
  assert.equal(approvedReport.mode, "behavioral");
  assert.equal(approvedReport.executed, true);
  assert.equal(approvedReport.percent, 100);
  assert.deepEqual(approvedReport.cases.map(item => item.passed), [true, true]);

  const averageReport = await grader.grade(averages,
    "WITH promedios AS (SELECT curso_id, AVG(nota) AS media FROM alumnos GROUP BY curso_id) SELECT curso_id, media FROM promedios WHERE media >= 5",
    {createDatabase:createMemorySqlite});
  assert.equal(averageReport.mode, "behavioral");
  assert.equal(averageReport.percent, 100);
  assert.deepEqual(averageReport.cases.map(item => item.passed), [true, true]);

  const relationReport = await grader.grade(noOrders,
    "SELECT c.id, c.nombre FROM clientes c LEFT JOIN pedidos p ON p.cliente_id = c.id WHERE p.id IS NULL",
    {createDatabase:createMemorySqlite});
  assert.equal(relationReport.mode, "behavioral");
  assert.equal(relationReport.percent, 100);
  assert.deepEqual(relationReport.cases.map(item => item.passed), [true, true]);
});

test("SQL con salida incorrecta falla casos y las consultas bloqueadas siguen sin ejecutarse", async () => {
  const exercise = exercises.find(item => item[1] === "SQL · listar aprobados");
  const wrong = await grader.grade(exercise,
    "SELECT nombre, nota FROM alumnos WHERE nota > 5 ORDER BY nota DESC",
    {createDatabase:createMemorySqlite});
  assert.equal(wrong.mode, "behavioral");
  assert.equal(wrong.executed, true);
  assert.equal(wrong.percent, 50, "el caso con nota exactamente 5 detecta el límite excluido");

  const blocked = await grader.grade(exercise,
    "WITH RECURSIVE serie(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM serie) SELECT n FROM serie",
    {createDatabase:createMemorySqlite});
  assert.equal(blocked.mode, "structural-only");
  assert.equal(blocked.executed, false);
  assert.equal(blocked.behaviorPercent, null);
  assert.match(blocked.message, /no llegó a SQLite/i);
});

test("el corrector SQL rechaza constantes, proyecciones parciales y tablas ajenas al enunciado", async () => {
  const approved = exercises.find(item => item[1] === "SQL · listar aprobados");
  const cases = [
    {answer:"SELECT 'Dora' AS nombre, 10 AS nota",executed:true},
    {answer:"SELECT nombre FROM alumnos WHERE nota >= 5 ORDER BY nota DESC",executed:true},
    {answer:"SELECT nombre, nota FROM cursos WHERE nota >= 5 ORDER BY nota DESC",executed:false}
  ];
  for (const item of cases) {
    const report = await grader.grade(approved, item.answer, {createDatabase:createMemorySqlite});
    assert.notEqual(report.percent, 100, item.answer);
    assert.equal(report.executed, item.executed, item.answer);
    if (!item.executed) assert.equal(report.behaviorPercent, null, item.answer);
  }
});

test("CTE VALUES y tablas fuera del enunciado se bloquean antes de SQLite", async () => {
  const exercise = exercises.find(item => item[1] === "SQL · listar aprobados");
  let queryCount = 0;
  const trackingFactory = () => {
    const database = createMemorySqlite();
    return {
      run:statement => database.run(statement),
      exec:query => { queryCount++; return database.exec(query); },
      close:() => database.close()
    };
  };
  const report = await grader.grade(exercise,
    "WITH nums(n) AS (VALUES (1),(2),(3)) SELECT nombre, nota FROM alumnos ORDER BY nota DESC",
    {createDatabase:trackingFactory});
  assert.equal(report.mode, "structural-only");
  assert.equal(report.executed, false);
  assert.equal(queryCount, 0);

  const wrongSource = await grader.grade(exercise,
    "SELECT nombre, nota FROM cursos WHERE nota >= 5 ORDER BY nota DESC",
    {createDatabase:trackingFactory});
  assert.equal(wrongSource.mode, "structural-only");
  assert.equal(wrongSource.executed, false);
  assert.equal(queryCount, 0);
});

test("las consultas SQL sin motor local y la práctica con transacción mantienen fallback honesto", async () => {
  const queryPractice = exercises.find(item => item[1] === "SQL · media por curso");
  const transaction = exercises.find(item => item[1] === "SQL · actualizar con transacción");
  const unavailable = await grader.grade(queryPractice, "SELECT curso_id, AVG(nota) FROM alumnos GROUP BY curso_id");
  assert.equal(unavailable.mode, "structural-only");
  assert.equal(unavailable.executed, false);
  assert.equal(unavailable.behaviorPercent, null);
  assert.equal(grader.requiresSqlDatabase(transaction), false);
  const structural = await grader.grade(transaction, "BEGIN TRANSACTION; UPDATE cuentas SET saldo = saldo - 20 WHERE id = 1; COMMIT;");
  assert.equal(structural.mode, "structural-only");
  assert.equal(structural.executed, false);
});

test("el aula conecta las prácticas SQL a bases SQLite temporales independientes", () => {
  const aula = fs.readFileSync(require.resolve("../public/aula.html"), "utf8");
  const check = aula.match(/async function checkE\(i\)\{[^\n]*/);
  assert.ok(check);
  assert.match(check[0], /CCPracticeGrader\.requiresSqlDatabase\(e\)/);
  assert.match(check[0], /await ideLoadSql\(\)/);
  assert.match(check[0], /options\.createDatabase=\(\)=>new ccSqlDb\.constructor\(\)/);
  assert.match(check[0], /CCPracticeGrader\.grade\(e,ans,options\)/);
});

test("JavaScript sustituye el array inicial con cada caso local", async () => {
  const exercise = exercises.find(item => item[1] === "JavaScript · filtrar aprobados");
  const answer = "const notas = [99]; const aprobadas = notas.filter(nota => nota >= 5);";
  const report = await grader.grade(exercise, answer);
  assert.equal(report.percent, 100);
  assert.deepEqual(report.cases.map(item => item.passed), [true, true, true, true]);
});

test("JavaScript conserva los declaradores siguientes al inyectar la entrada", async () => {
  const exercise = exercises.find(item => item[1] === "JavaScript · filtrar aprobados");
  const answer = "const notas = [99], aprobadas = notas.filter(nota => nota >= 5);";
  const report = await grader.grade(exercise, answer);
  assert.equal(report.mode, "behavioral");
  assert.equal(report.percent, 100);
  assert.deepEqual(report.cases.map(item => item.passed), [true, true, true, true]);
});

test("JavaScript inyecta casos en una entrada let declarada y asignada en sentencias separadas", async () => {
  calls = [];
  const exercise = exercises.find(item => item[1] === "JavaScript · filtrar aprobados");
  const answer = "let notas; notas = [4, 7, 9, 3]; const aprobadas = notas.filter(n => n >= 5);";
  const report = await grader.grade(exercise, answer);
  assert.equal(report.mode, "behavioral");
  assert.equal(report.percent, 100);
  assert.deepEqual(report.cases.map(item => item.passed), [true, true, true, true]);

  const exactCase = runWorker(calls[0].source, {
    source:answer,inputName:"notas",outputName:"aprobadas",
    cases:[{input:[4, 7, 9, 3],expected:[7, 9]}]
  });
  assert.deepEqual(exactCase.map(item => item.value), [[7, 9]]);
});

test("JavaScript pasa a revisión estructural si no reconoce con seguridad el inicializador", async () => {
  const exercise = exercises.find(item => item[1] === "JavaScript · filtrar aprobados");
  const answer = "const notas = Array.of(99); const aprobadas = notas.filter(nota => nota >= 5);";
  const report = await grader.grade(exercise, answer);
  assert.equal(report.mode, "structural-only");
  assert.equal(report.executed, false);
  assert.equal(report.behaviorPercent, null);
  assert.match(report.message, /no se pudo ejecutar localmente/i);
});

test("una respuesta JavaScript que no compila queda como revisión estructural", async () => {
  const exercise = exercises.find(item => item[1] === "JavaScript · filtrar aprobados");
  const report = await grader.grade(exercise, "const aprobadas = ;");
  assert.equal(report.mode, "structural-only");
  assert.equal(report.executed, false);
  assert.equal(report.behaviorPercent, null);
  assert.match(report.message, /no se pudo ejecutar localmente/i);
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

test("el corrector SQL acepta CTE no recursivos y bloquea CTE recursivos o escrituras", () => {
  let executed = 0;
  const fixture = {
    run() {}, close() {},
    exec(query) {
      executed++;
      if (/count\s*\(/i.test(query)) return [{columns:["nombre","num_prestamos"],values:[["Ana",2],["Luis",2],["Marta",0]]}];
      if (/not\s+exists|\bwith\b/i.test(query)) return [{columns:["titulo"],values:[["XML"]]}];
      return [{columns:["prestamo_id","titulo","nombre"],values:[[2,"SQL","Ana"],[3,"Kotlin","Luis"]]}];
    }
  };
  const report = grader.gradeSqlAssignment({
    active:"SELECT p.id AS prestamo_id, l.titulo, u.nombre FROM prestamos p LEFT JOIN libros l ON l.id=p.libro_id LEFT JOIN usuarios u ON u.id=p.usuario_id WHERE p.fecha_devolucion IS NULL",
    counts:"SELECT u.nombre, COUNT(p.id) AS num_prestamos FROM usuarios u LEFT JOIN prestamos p ON p.usuario_id=u.id GROUP BY u.id",
    unborrowed:"WITH libros_sin AS (SELECT titulo FROM libros WHERE id=4) SELECT titulo FROM libros_sin"
  }, () => fixture);
  assert.equal(report.percent, 100);
  assert.equal(report.tests[0].passed, true);
  assert.equal(report.tests[1].passed, true);
  assert.equal(report.tests[2].passed, true);
  assert.equal(executed, 3);

  const recursive = grader.gradeSqlAssignment({
    active:"WITH RECURSIVE serie(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM serie) SELECT n FROM serie",
    counts:"UPDATE usuarios SET nombre='modificado'",
    unborrowed:"SELECT id FROM libros WHERE id=4"
  }, () => fixture);
  assert.equal(recursive.tests.every(item => !item.passed), true);
  assert.match(recursive.tests[0].message, /CTE no recursivo/i);
  assert.equal(executed, 4, "ni la recursión ni la escritura alcanzan SQLite");
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

test("el corrector SQL acepta alias camelCase equivalentes a los nombres del contrato", () => {
  const results = {
    active:[{columns:["loanId","bookTitle","borrowerName"],values:[[2,"SQL","Ana"],[3,"Kotlin","Luis"]]}],
    counts:[{columns:["userId","loanCount"],values:[[1,2],[2,2],[3,0]]}],
    unborrowed:[{columns:["bookTitle"],values:[["XML"]]}]
  };
  const report = grader.gradeSqlAssignment({
    active:"SELECT p.id AS loanId,l.titulo AS bookTitle,u.nombre AS borrowerName FROM prestamos p JOIN libros l ON l.id=p.libro_id JOIN usuarios u ON u.id=p.usuario_id WHERE p.fecha_devolucion IS NULL",
    counts:"SELECT u.id AS userId,COUNT(p.id) AS loanCount FROM usuarios u LEFT JOIN prestamos p ON p.usuario_id=u.id GROUP BY u.id",
    unborrowed:"SELECT l.titulo AS bookTitle FROM libros l WHERE NOT EXISTS(SELECT 1 FROM prestamos p WHERE p.libro_id=l.id)"
  }, () => createSqlFixture(results));
  assert.equal(report.percent, 100);
  assert.deepEqual(report.tests.map(item => item.passed), [true,true,true]);
});

test("las tres consultas se ejecutan en SQLite en memoria sin usar servicios", () => {
  const report = grader.gradeSqlAssignment({
    active:"SELECT p.id AS loanId,l.titulo AS bookTitle,u.nombre AS borrowerName FROM prestamos p JOIN libros l ON l.id=p.libro_id JOIN usuarios u ON u.id=p.usuario_id WHERE p.fecha_devolucion IS NULL",
    counts:"SELECT u.id AS userId,COUNT(p.id) AS loanCount FROM usuarios u LEFT JOIN prestamos p ON p.usuario_id=u.id GROUP BY u.id",
    unborrowed:"SELECT l.titulo AS bookTitle FROM libros l WHERE NOT EXISTS(SELECT 1 FROM prestamos p WHERE p.libro_id=l.id)"
  }, createMemorySqlite);
  assert.equal(report.percent, 100);
  assert.equal(report.executed, true);
  assert.deepEqual(report.tests.map(item => item.passed), [true,true,true]);
});

test("el contrato declara los límites de la evaluación conductual y estructural", () => {
  const contract = grader.contracts();
  assert.match(contract.behavioralLimits, /solo en los casos locales incluidos/i);
  assert.match(contract.behavioralLimits, /no demuestra.*correcta para todas las entradas/i);
  assert.match(contract.behavioralLimits, /inicializadores simples de array/i);
  assert.match(contract.behavioralLimits, /asignaciones directas a una variable let\/var/i);
  assert.match(contract.behavioralLimits, /pasa a revisión estructural/i);
  assert.match(contract.behavioralLimits, /SQL admite SELECT y CTE no recursivos/i);
  assert.match(contract.behavioralLimits, /consultas rechazadas por la política no llegan a SQLite/i);
  assert.deepEqual(contract.behavioralPractices.slice(-3), ["SQL · listar aprobados","SQL · media por curso","SQL · detectar registros sin relación"]);
  assert.match(contract.behavioralLimits, /bases SQLite temporales con datos distintos por caso/i);
  assert.match(contract.otherLanguages, /estructural/i);
  assert.equal(contract.privacy.sendsAnswerToService, false);
  assert.equal(contract.privacy.telemetry, false);
  assert.equal(contract.privacy.persistentStorage, false);
  assert.equal(contract.privacy.networkAccessInBehavioralRunner, false);
});

test.after(() => {
  if (previousSandbox === undefined) delete globalThis.CCSandbox;
  else globalThis.CCSandbox = previousSandbox;
});
