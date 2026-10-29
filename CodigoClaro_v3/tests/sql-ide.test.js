"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const aula = fs.readFileSync(path.join(__dirname, "../public/aula.html"), "utf8");
const start = aula.indexOf("function ideSqlStructureIsSafe");
const end = aula.indexOf("\n// ideRunSQL", start);
assert.ok(start >= 0 && end > start);
const sql = vm.runInNewContext(aula.slice(start, end) + "\n({isSafe:ideSqlStructureIsSafe,render:ideRenderSqlResults})");

function createStatement(rowCount, value = index => index) {
  let index = 0;
  let current = null;
  return {
    freed: false,
    getColumnNames() { return ["resultado"]; },
    step() {
      if (index >= rowCount) return false;
      current = index++;
      return true;
    },
    get() { return [value(current)]; },
    free() { this.freed = true; }
  };
}

function createIterator(statements) {
  let index = 0;
  const iterator = {
    sqlPtr: 1,
    activeStatement: null,
    finalized: false,
    next() {
      if (index >= statements.length) {
        this.finalize();
        return {done:true};
      }
      this.activeStatement = statements[index++];
      return {done:false,value:this.activeStatement};
    },
    [Symbol.iterator]() { return this; },
    finalize() { this.finalized = true; this.sqlPtr = null; }
  };
  return iterator;
}

test("el IDE admite scripts SQL de varias sentencias con resultados legibles", () => {
  const db = {iterateStatements:() => createIterator([
    {getColumnNames:() => [],step:() => false,free(){}},
    createStatement(2)
  ])};
  const output = sql.render(db, "CREATE TABLE prueba(x); SELECT x FROM prueba;");
  assert.ok(output.includes(["0","1"].join(String.fromCharCode(10))));
  assert.ok(output.includes("2 fila(s)"));
});

test("el IDE frena la salida SQL sin materializar todas las filas", () => {
  const statement = createStatement(10000);
  let iterator;
  const db = {iterateStatements:() => (iterator = createIterator([statement]))};
  const output = sql.render(db, "SELECT x FROM tabla");
  assert.match(output, /La salida se detuvo al alcanzar 200 filas o 20 KB/);
  assert.equal(output.split(String.fromCharCode(10)).length <= 204, true);
  assert.equal(statement.freed, true);
  assert.equal(iterator.finalized, true);
});

test("el IDE rechaza SQL recursivo o con funciones que pueden disparar recursos", () => {
  let executed = 0;
  const db = {iterateStatements() { executed++; return createIterator([]); }};
  assert.throws(() => sql.render(db, "WITH RECURSIVE serie(n) AS (SELECT 1 UNION ALL SELECT n+1 FROM serie) SELECT n FROM serie"), /límites locales/i);
  assert.throws(() => sql.render(db, "SELECT randomblob(1000000000)"), /límites locales/i);
  assert.equal(executed, 0);
});

test("el IDE limita longitud y anidación antes de preparar la consulta", () => {
  let executed = 0;
  const db = {iterateStatements() { executed++; return createIterator([]); }};
  assert.throws(() => sql.render(db, "SELECT " + "(".repeat(13) + "1" + ")".repeat(13)), /límites locales/i);
  assert.throws(() => sql.render(db, "SELECT " + "x".repeat(20000)), /20 KB/i);
  assert.equal(executed, 0);
});
