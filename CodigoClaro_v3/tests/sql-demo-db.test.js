"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {DatabaseSync} = require("node:sqlite");

const aula = fs.readFileSync(path.join(__dirname, "../public/aula.html"), "utf8").replace(/\r\n/g, "\n");
const start = aula.indexOf("async function ideLoadSql(){");
const end = aula.indexOf("\n}\n// ideRenderSqlResults", start) + 2;
assert.ok(start >= 0 && end > start, "se encuentra la inicialización SQLite del IDE");
const initializer = aula.slice(start, end);

class SqlJsDatabaseFixture {
  constructor(buffer) {
    this.database = new DatabaseSync(":memory:");
    if (buffer) {
      assert.equal(Buffer.from(buffer).toString("utf8"), "legacy");
      this.database.exec(`
        CREATE TABLE cursos (id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, nivel TEXT);
        INSERT INTO cursos VALUES (1,'Java','inicial'),(2,'SQL','medio'),(3,'Python','inicial');
        CREATE TABLE alumnos (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, nota REAL CHECK(nota >= 0 AND nota <= 10));
        INSERT INTO alumnos VALUES (1,'Lucía',8.5),(2,'Mario',4.2),(3,'Inés',9.1),(4,'Pablo',6.7);
      `);
    }
  }

  run(sql) {
    this.database.exec(sql);
  }

  exec(sql) {
    const statement = this.database.prepare(sql);
    const columns = statement.columns().map(column => column.name);
    if (!columns.length) return [];
    const values = statement.all().map(row => columns.map(column => row[column]));
    return [{columns, values}];
  }

  close() {
    this.database.close();
  }
}

async function initialize(storageValue) {
  const context = {
    ccSqlDb:null,
    ccSqlPromise:null,
    ccSqlGeneration:0,
    CC_SQLJS:"https://example.invalid/sql.js/",
    ccLoadScript:async () => {},
    ccStorageGet:() => storageValue,
    ccStorageRemove() {},
    atob:value => value,
    window:{initSqlJs:async () => ({Database:SqlJsDatabaseFixture})}
  };
  const load = vm.runInNewContext(`${initializer}\nideLoadSql`, context);
  const database = await load();
  return {database, context};
}

for (const [label, savedValue] of [["base nueva",null],["base local anterior","legacy"]]) {
  test(`el IDE dispone de cursos, alumnos relacionados y cuentas en una ${label}`, async () => {
    const {database} = await initialize(savedValue);
    try {
      const averages = database.exec(`
        SELECT c.titulo, AVG(a.nota) AS media
        FROM alumnos a JOIN cursos c ON c.id=a.curso_id
        GROUP BY c.id ORDER BY c.id
      `)[0].values;
      assert.equal(averages.length, 3);
      assert.deepEqual(averages.map(row => row[0]), ["Java","SQL","Python"]);

      database.run(`BEGIN TRANSACTION;
        UPDATE cuentas SET saldo=saldo-20 WHERE id=1;
        UPDATE cuentas SET saldo=saldo+20 WHERE id=2;
        COMMIT;`);
      const balances = database.exec("SELECT saldo FROM cuentas ORDER BY id")[0].values;
      assert.deepEqual(balances, [[80],[70]]);
    } finally {
      database.close();
    }
  });
}
