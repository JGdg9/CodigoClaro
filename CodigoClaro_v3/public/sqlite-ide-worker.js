"use strict";

const CC_SQLJS = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/";
let databaseState = null;
let initialization = null;

async function initializeDatabase(saved) {
  if (initialization) return initialization;
  initialization = (async () => {
    importScripts(CC_SQLJS + "sql-wasm.js");
    if (typeof self.initSqlJs !== "function") throw new Error("No se ha cargado SQL.js");
    const SQL = await self.initSqlJs({locateFile: file => CC_SQLJS + file});
    let db = null;
    let clearSaved = false;
    if (saved) {
      try {
        const raw = atob(saved);
        db = new SQL.Database(Uint8Array.from(raw, character => character.charCodeAt(0)));
      } catch {
        clearSaved = true;
      }
    }
    if (!db) db = new SQL.Database();

    try {
      seedDatabase(db);
      databaseState = {db, clearSaved};
      return databaseState;
    } catch (error) {
      db.close();
      throw error;
    }
  })().catch(error => {
    initialization = null;
    throw error;
  });
  return initialization;
}

function seedDatabase(db) {
  db.run("PRAGMA foreign_keys=ON");
  db.run("CREATE TABLE IF NOT EXISTS departamentos (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL)");
  db.run("CREATE TABLE IF NOT EXISTS cursos (id INTEGER PRIMARY KEY, titulo TEXT NOT NULL, nivel TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS empleados (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, departamento_id INTEGER, salario REAL, FOREIGN KEY(departamento_id) REFERENCES departamentos(id))");
  db.run("CREATE TABLE IF NOT EXISTS alumnos (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, nota REAL CHECK(nota >= 0 AND nota <= 10), curso_id INTEGER REFERENCES cursos(id))");
  db.run("CREATE TABLE IF NOT EXISTS cuentas (id INTEGER PRIMARY KEY, titular TEXT NOT NULL, saldo REAL NOT NULL CHECK(saldo >= 0))");

  const alumnoColumns = db.exec("PRAGMA table_info(alumnos)")[0]?.values || [];
  const needsCourseMigration = !alumnoColumns.some(column => column[1] === "curso_id");
  if (needsCourseMigration) db.run("ALTER TABLE alumnos ADD COLUMN curso_id INTEGER");
  db.run("INSERT OR IGNORE INTO departamentos VALUES (1,'Desarrollo'),(2,'Sistemas'),(3,'Datos')");
  db.run("INSERT OR IGNORE INTO empleados VALUES (1,'Ana',1,1800),(2,'Luis',2,1650),(3,'Marta',1,2200),(4,'Pablo',3,1950)");
  db.run("INSERT OR IGNORE INTO cursos VALUES (1,'Java','inicial'),(2,'SQL','medio'),(3,'Python','inicial')");
  if (!needsCourseMigration) {
    db.run("INSERT OR IGNORE INTO alumnos (id,nombre,nota,curso_id) VALUES (1,'Lucía',8.5,1),(2,'Mario',4.2,2),(3,'Inés',9.1,3),(4,'Pablo',6.7,2)");
  } else {
    db.run("INSERT OR IGNORE INTO alumnos (id,nombre,nota) VALUES (1,'Lucía',8.5),(2,'Mario',4.2),(3,'Inés',9.1),(4,'Pablo',6.7)");
    db.run("UPDATE alumnos SET curso_id=CASE id WHEN 1 THEN 1 WHEN 2 THEN 2 WHEN 3 THEN 3 WHEN 4 THEN 2 END WHERE curso_id IS NULL AND ((id=1 AND nombre='Lucía') OR (id=2 AND nombre='Mario') OR (id=3 AND nombre='Inés') OR (id=4 AND nombre='Pablo'))");
  }
  const accountColumns = db.exec("PRAGMA table_info(cuentas)")[0]?.values || [];
  if (accountColumns.length === 3 && accountColumns.some(column => column[1] === "titular") && accountColumns.some(column => column[1] === "saldo")) {
    db.run("INSERT OR IGNORE INTO cuentas (id,titular,saldo) VALUES (1,'Ana',100),(2,'Luis',50)");
  }
}

function ideSqlStructureIsSafe(query) {
  const withoutComments = query.replace(/--[^\r\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  if (/\bWITH\s+RECURSIVE\b|\b(?:ATTACH|DETACH|PRAGMA|VACUUM|ANALYZE|REINDEX|LOAD_EXTENSION|RANDOMBLOB|ZEROBLOB)\b/i.test(withoutComments)) return false;
  if ((withoutComments.match(/\bSELECT\b/gi) || []).length > 12 || (withoutComments.match(/\bJOIN\b/gi) || []).length > 8) return false;
  let depth = 0;
  let quote = "";
  for (let index = 0; index < query.length; index++) {
    const character = query[index];
    if (quote) {
      if (character === quote) {
        if (query[index + 1] === quote) index++;
        else quote = "";
      }
      continue;
    }
    if (character === "'" || character === '"' || character === String.fromCharCode(96)) quote = character;
    else if (character === "[") quote = "]";
    else if (character === "(" && ++depth > 12) return false;
    else if (character === ")" && --depth < 0) return false;
  }
  return depth === 0;
}

function renderSqlResults(db, query) {
  const source = String(query || "");
  if (!source.trim()) throw new Error("Escribe una consulta SQL antes de ejecutarla.");
  if (source.length > 20000) throw new Error("La consulta supera el límite local de 20 KB.");
  if (!ideSqlStructureIsSafe(source)) throw new Error("La consulta supera los límites locales de complejidad o contiene una operación no permitida.");
  const output = [];
  const maxRows = 200;
  const maxChars = 20000;
  let iterator = null;
  let statementCount = 0;
  let totalRows = 0;
  let totalChars = 0;
  let truncated = false;
  const push = line => {
    if (totalChars + line.length + 1 > maxChars) {
      truncated = true;
      return false;
    }
    output.push(line);
    totalChars += line.length + 1;
    return true;
  };
  try {
    iterator = db.iterateStatements(source);
    for (const statement of iterator) {
      statementCount++;
      if (statementCount > 20) throw new Error("La consulta supera el máximo de 20 sentencias.");
      const columns = statement.getColumnNames();
      if (columns.length && (!push(columns.join(" | ")) || !push(columns.map(() => "------------").join(" | ")))) break;
      let rows = 0;
      while (statement.step()) {
        if (totalRows >= maxRows) {
          truncated = true;
          break;
        }
        const values = statement.get().map(value => {
          if (value === null) return "NULL";
          if (value && typeof value === "object" && Number.isInteger(value.byteLength)) return "[BLOB " + value.byteLength + " bytes]";
          const cell = String(value);
          return cell.length > 1000 ? cell.slice(0, 1000) + "…" : cell;
        });
        if (!push(values.join(" | "))) break;
        rows++;
        totalRows++;
      }
      if (columns.length && !push(rows + " fila(s)")) truncated = true;
      if (truncated) break;
    }
  } finally {
    if (iterator) {
      try {
        if (iterator.activeStatement) {
          iterator.activeStatement.free();
          iterator.activeStatement = null;
        }
      } finally {
        if (iterator.sqlPtr !== null && typeof iterator.finalize === "function") iterator.finalize();
      }
    }
  }
  if (!output.length) output.push("Sentencia ejecutada correctamente. (DDL/DML sin conjunto de resultados)");
  if (truncated) output.push("La salida se detuvo al alcanzar 200 filas o 20 KB. Ejecuta una consulta más concreta.");
  return output.join("\n");
}

function exportDatabase(db) {
  const data = db.export();
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

async function handleMessage(message) {
  const {id, action, saved, sql} = message || {};
  if (!Number.isSafeInteger(id) || !["init", "run", "reset", "export"].includes(action)) return;
  try {
    if (action === "init") {
      const state = await initializeDatabase(saved || "");
      self.postMessage({id, ok: true, ready: true, clearSaved: state.clearSaved});
      return;
    }
    if (!databaseState) throw new Error("El motor SQLite local no se ha iniciado.");
    if (action === "reset") {
      databaseState.db.close();
      databaseState = null;
      initialization = null;
      const state = await initializeDatabase("");
      self.postMessage({id, ok: true, output: "Base SQLite restaurada con alumnos, cursos, empleados y departamentos.", database: exportDatabase(state.db)});
      return;
    }
    if (action === "export") {
      self.postMessage({id, ok: true, database: exportDatabase(databaseState.db)});
      return;
    }
    const output = renderSqlResults(databaseState.db, sql);
    self.postMessage({id, ok: true, output, database: exportDatabase(databaseState.db)});
  } catch (error) {
    self.postMessage({id, ok: false, error: String(error?.message || "No se pudo ejecutar SQL en SQLite.").slice(0, 1200)});
  }
}

self.addEventListener("message", event => {
  void handleMessage(event.data);
});
