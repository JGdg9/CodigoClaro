const PGLITE_MODULE_URL = 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite@0.5.12/dist/index.js';
let databasePromise = null;

async function openDatabase(dataDir) {
  if (!/^idb:\/\/codigoclaro-[a-f0-9-]{8,80}$/i.test(dataDir || '')) {
    throw new Error('La identidad de la base local no es válida.');
  }
  if (!databasePromise) {
    databasePromise = import(PGLITE_MODULE_URL).then(async ({ PGlite }) => {
      if (typeof PGlite?.create !== 'function') throw new Error('La biblioteca PostgreSQL no ofrece su API esperada.');
      const db = await PGlite.create(dataDir, { relaxedDurability: true });
      await seedExamples(db);
      return db;
    }).catch(error => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function seedExamples(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cc_ejemplos_inicializados (id INTEGER PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS departamentos (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS empleados (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      departamento_id INTEGER REFERENCES departamentos(id),
      salario NUMERIC(10, 2) NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS alumnos (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      nota NUMERIC(4, 2) CHECK (nota BETWEEN 0 AND 10)
    );
    CREATE TABLE IF NOT EXISTS cursos (
      id INTEGER PRIMARY KEY,
      titulo TEXT NOT NULL
    );
  `);
  const seeded = await db.query('SELECT id FROM cc_ejemplos_inicializados WHERE id = 1');
  if (seeded.rows.length) return;
  await db.exec(`
    INSERT INTO departamentos (id, nombre) VALUES (1, 'Desarrollo'), (2, 'Sistemas');
    INSERT INTO empleados (id, nombre, departamento_id, salario) VALUES
      (1, 'Ana', 1, 1800), (2, 'Luis', 1, 1650), (3, 'Marta', 2, 2100);
    INSERT INTO alumnos (id, nombre, nota) VALUES
      (1, 'Ana', 8), (2, 'Luis', 4), (3, 'Marta', 9);
    INSERT INTO cursos (id, titulo) VALUES (1, 'Programación'), (2, 'Bases de datos');
    INSERT INTO cc_ejemplos_inicializados (id) VALUES (1);
  `);
}

function safeSql(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Escribe una consulta SQL antes de ejecutarla.');
  if (new TextEncoder().encode(source).byteLength > 20000) throw new Error('La consulta supera el límite local de 20 KB.');
  const normalized = source
    .replace(/--[^\r\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/'(?:''|[^'])*'/g, "''")
    .replace(/"(?:""|[^"])*"/g, '""');
  if (/\b(?:SET|SET_CONFIG|RESET|COPY|DO|CALL|BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE|LISTEN|NOTIFY|PREPARE|EXECUTE|DEALLOCATE|VACUUM|ANALYZE|REINDEX|CREATE\s+EXTENSION|DROP\s+DATABASE|CREATE\s+DATABASE|ALTER\s+SYSTEM|CREATE\s+(?:FUNCTION|PROCEDURE|TRIGGER))\b/i.test(normalized)) {
    throw new Error('Esta práctica bloquea ajustes de sesión, rutinas, extensiones y operaciones del servidor.');
  }
  if (/\b(?:WITH\s+RECURSIVE|GENERATE_SERIES|PG_SLEEP|PG_TERMINATE_BACKEND|PG_READ_FILE|PG_WRITE_FILE|PG_LS_DIR|LO_IMPORT|LO_EXPORT|REPEAT)\b/i.test(normalized)) {
    throw new Error('La consulta usa una operación que no está disponible en el laboratorio local.');
  }
  const statements = normalized.split(';').filter(statement => statement.trim());
  if (statements.length > 20) throw new Error('La consulta supera el máximo local de 20 sentencias.');
  return source;
}

function renderResults(results) {
  const lines = [];
  let rowCount = 0;
  let charCount = 0;
  let truncated = false;
  const push = value => {
    const line = String(value);
    if (charCount + line.length + 1 > 20000) {
      truncated = true;
      return false;
    }
    lines.push(line);
    charCount += line.length + 1;
    return true;
  };
  for (const result of results) {
    const rows = Array.isArray(result.rows) ? result.rows : [];
    const columns = Array.isArray(result.fields) ? result.fields.map(field => field.name) : Object.keys(rows[0] || {});
    if (columns.length) {
      if (!push(columns.join(' | '))) break;
      if (!push(columns.map(() => '------------').join(' | '))) break;
      for (const row of rows.slice(0, 200 - rowCount)) {
        const values = columns.map(column => {
          const value = row[column];
          if (value === null || value === undefined) return 'NULL';
          const printable = typeof value === 'object' ? JSON.stringify(value) : String(value);
          return printable.length > 1000 ? printable.slice(0, 1000) + '…' : printable;
        });
        if (!push(values.join(' | '))) break;
        rowCount++;
      }
      if (!push(`${Math.min(rows.length, 200)} fila(s) devueltas`)) break;
      if (rows.length > 200 - rowCount) truncated = true;
    } else if (result.command) {
      if (!push(`Sentencia ${result.command} ejecutada${Number.isInteger(result.affectedRows) ? `; ${result.affectedRows} fila(s) afectadas` : ''}.`)) break;
    }
    if (truncated || rowCount >= 200) {
      truncated = true;
      break;
    }
  }
  if (!lines.length) lines.push('Sentencias ejecutadas correctamente.');
  if (truncated) lines.push('Salida limitada a 200 filas o 20 KB.');
  return lines.join('\n');
}

self.addEventListener('message', async event => {
  const { id, action, dataDir, sql } = event.data || {};
  if (!Number.isSafeInteger(id) || !['run', 'reset'].includes(action)) return;
  try {
    const db = await openDatabase(dataDir);
    if (action === 'reset') {
      await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
      await seedExamples(db);
      self.postMessage({ id, ok: true, output: 'Base PostgreSQL local restablecida con los datos de ejemplo.' });
      return;
    }
    const source = safeSql(sql);
    const queryResults = [];
    await db.exec("BEGIN; SET LOCAL statement_timeout = '5000ms';");
    try {
      queryResults.push(...await db.exec(source));
      await db.exec('COMMIT;');
    } catch (error) {
      try { await db.exec('ROLLBACK;'); } catch {}
      throw error;
    }
    self.postMessage({ id, ok: true, output: renderResults(queryResults) });
  } catch (error) {
    self.postMessage({ id, ok: false, error: String(error?.message || 'No se pudo ejecutar SQL en PostgreSQL.').slice(0, 1200) });
  }
});
