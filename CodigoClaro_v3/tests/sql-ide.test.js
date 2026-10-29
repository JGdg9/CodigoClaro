"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const aula = fs.readFileSync(path.join(__dirname, "../public/aula.html"), "utf8");
const postgresWorker = fs.readFileSync(path.join(__dirname, "../public/postgres-ide-worker.js"), "utf8");
const sqliteWorker = fs.readFileSync(path.join(__dirname, "../public/sqlite-ide-worker.js"), "utf8");
const start = sqliteWorker.indexOf("function ideSqlStructureIsSafe");
const end = sqliteWorker.indexOf("\nfunction exportDatabase", start);
assert.ok(start >= 0 && end > start);
const sql = vm.runInNewContext(sqliteWorker.slice(start, end) + "\n({isSafe:ideSqlStructureIsSafe,render:renderSqlResults})");

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

test("el worker PostgreSQL limita sentencias peligrosas y mantiene una lista blanca didáctica", () => {
  const start = postgresWorker.indexOf("function safeSql(");
  const end = postgresWorker.indexOf("\nfunction renderResults(", start);
  assert.ok(start >= 0 && end > start);
  const safeSql = vm.runInNewContext(postgresWorker.slice(start, end) + "\nsafeSql;", {TextEncoder});

  assert.equal(safeSql("CREATE TABLE alumnos(id integer); INSERT INTO alumnos VALUES (1); SELECT * FROM alumnos;"), "CREATE TABLE alumnos(id integer); INSERT INTO alumnos VALUES (1); SELECT * FROM alumnos;");
  for (const query of [
    "SET statement_timeout = 0; SELECT 1;",
    "SELECT set_config('statement_timeout', '0', false);",
    "SELECT pg_sleep(30);",
    "WITH RECURSIVE serie(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM serie) SELECT n FROM serie;",
    "COPY alumnos TO '/tmp/salida';",
    "BEGIN; SELECT 1; COMMIT;",
    "SELECT " + "x".repeat(20000)
  ]) assert.throws(() => safeSql(query));
});

test("la salida PostgreSQL se limita a 200 filas y 20 KB", () => {
  const start = postgresWorker.indexOf("function renderResults(");
  const end = postgresWorker.indexOf("\nself.addEventListener", start);
  assert.ok(start >= 0 && end > start);
  const render = vm.runInNewContext(postgresWorker.slice(start, end) + "\nrenderResults;", {});
  const output = render([{fields:[{name:"n"}],rows:Array.from({length:205},(_,n)=>({n})),command:"SELECT"}]);

  assert.match(output, /200 fila\(s\) devueltas/);
  assert.match(output, /Salida limitada a 200 filas o 20 KB/);
  assert.doesNotMatch(output, /\n200\n/);
});

test("SQLite se ejecuta en un worker terminable y guarda la última base correcta", async () => {
  const start = aula.indexOf("function ideSqlitePersistDatabase(");
  const end = aula.indexOf("async function ideRunSQL(", start);
  assert.ok(start >= 0 && end > start);
  const timers = [];
  const stored = {};
  class FakeWorker {
    static autoRespondRun = false;
    static instances = [];
    constructor(url) { this.url = String(url); this.listeners = {}; this.messages = []; this.terminated = false; FakeWorker.instances.push(this); }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    postMessage(message) {
      this.messages.push(message);
      if (message.action === "init") this.listeners.message({data:{id:message.id,ok:true,ready:true}});
      else if (message.action === "run" && FakeWorker.autoRespondRun) this.listeners.message({data:{id:message.id,ok:true,output:"1",database:new Uint8Array([1,2,3]).buffer}});
    }
    terminate() { this.terminated = true; }
  }
  const context = {
    ccSqlWorker:null,ccSqlWorkerReady:null,ccSqlWorkerPending:new Map(),ccSqlRequestId:0,ccSqlActiveRequest:null,
    Worker:FakeWorker,URL,document:{baseURI:"https://example.test/aula.html"},Uint8Array,ArrayBuffer,btoa,
    ccStorageGet:key=>stored[key]||null,ccStorageSet:(key,value)=>{stored[key]=value},ccStorageRemove:key=>{delete stored[key]},
    setTimeout:(callback,delay)=>{const timer={callback,delay,cleared:false};timers.push(timer);return timer},
    clearTimeout:timer=>{if(timer)timer.cleared=true}
  };
  const api = vm.runInNewContext(aula.slice(start,end)+"\n({request:ideSqliteRequest})",context);
  const timedOut = api.request("run",{sql:"SELECT 1"},5000);
  await new Promise(resolve=>setImmediate(resolve));
  const worker = FakeWorker.instances[0];
  assert.ok(worker.messages.some(message=>message.action==="run"));
  const watchdog = timers.find(timer=>timer.delay===5000&&!timer.cleared);
  assert.ok(watchdog,"la consulta debe tener un watchdog de cinco segundos");
  watchdog.callback();
  await assert.rejects(timedOut,/superó el límite de 5 segundos/);
  assert.equal(worker.terminated,true,"el timeout debe terminar el worker");
  assert.equal(stored.cc_sqlite_demo_db,undefined,"no se debe persistir una ejecución interrumpida");

  FakeWorker.autoRespondRun=true;
  const completed=await api.request("run",{sql:"SELECT 1"},5000);
  assert.equal(completed.output,"1");
  assert.equal(stored.cc_sqlite_demo_db,"AQID","el worker debe devolver la base para persistirla localmente");
  assert.match(aula,/new Worker\(new URL\('\.\/sqlite-ide-worker\.js',document\.baseURI\)/);
  assert.match(sqliteWorker,/db\.iterateStatements\(source\)/);
  assert.match(sqliteWorker,/INSERT OR IGNORE INTO alumnos/);
  assert.doesNotMatch(aula,/function ideRenderSqlResults\(/);
});

test("PostgreSQL se carga en un worker local con persistencia IndexedDB y sin enviar consultas", () => {
  assert.match(aula, /new Worker\(new URL\('\.\/postgres-ide-worker\.js',document\.baseURI\),\{type:'module'/);
  assert.match(aula, /idb:\/\/codigoclaro-/);
  assert.match(postgresWorker, /@electric-sql\/pglite@0\.5\.12/);
  assert.match(postgresWorker, /PGlite\.create\(dataDir/);
  assert.doesNotMatch(postgresWorker, /fetch\(|XMLHttpRequest|sendBeacon/);
});
