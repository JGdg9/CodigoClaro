const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../lib/migrate');
const initialSchema = require('../migrations/001_initial_schema');
const root = path.resolve(__dirname, '..');

function withDatabase(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-migrations-'));
  const db = new DatabaseSync(path.join(directory, 'test.sqlite'));
  try { return run(db); }
  finally { db.close(); fs.rmSync(directory, { recursive: true, force: true }); }
}

test('SQLite migrations are versioned, repeatable, and preserve existing rows', () => withDatabase(db => {
  assert.deepEqual(runMigrations(db), ['001_initial_schema']);
  db.prepare('INSERT INTO users(email,display_name,password_hash) VALUES(?,?,?)')
    .run('learner@codigoclaro.test', 'Learner', 'test-hash');
  assert.deepEqual(runMigrations(db), []);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 1);
  assert.equal(db.prepare('SELECT email FROM users').get().email, 'learner@codigoclaro.test');
}));

test('an existing current SQLite schema is baselined without deleting data', () => withDatabase(db => {
  initialSchema.up(db);
  db.prepare('INSERT INTO users(email,display_name,password_hash) VALUES(?,?,?)')
    .run('existing@codigoclaro.test', 'Existing', 'test-hash');
  assert.deepEqual(runMigrations(db), ['001_initial_schema']);
  assert.equal(db.prepare('SELECT email FROM users').get().email, 'existing@codigoclaro.test');
}));

test('an incompatible legacy SQLite schema stops before changing its data', () => withDatabase(db => {
  db.exec('CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT NOT NULL UNIQUE)');
  db.prepare('INSERT INTO users(email) VALUES(?)').run('existing@codigoclaro.test');
  assert.throws(() => runMigrations(db), /no coincide con el esquema actual/);
  assert.equal(db.prepare('SELECT email FROM users').get().email, 'existing@codigoclaro.test');
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 0);
}));

test('a failed SQLite migration rolls back its schema and version record', () => withDatabase(db => {
  const migration = { id: '001_test_failure', up(connection) { connection.exec('CREATE TABLE partial_change(id INTEGER)'); throw new Error('deliberate test failure'); } };
  assert.throws(() => runMigrations(db, [migration]), /deliberate test failure/);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type='table' AND name='partial_change'").get().count, 0);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM schema_migrations').get().count, 0);
}));

test('the migration command creates or updates only the configured SQLite file', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-migrate-cli-'));
  const dbPath = path.join(directory, 'local.sqlite');
  const env = { ...process.env, DB_PATH: dbPath };
  const run = () => spawnSync(process.execPath, ['scripts/migrate-db.js'], { cwd: root, env, encoding: 'utf8' });
  try {
    const first = run();
    assert.equal(first.status, 0, first.stderr);
    assert.match(first.stdout, /001_initial_schema/);
    const second = run();
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /esquema ya está actualizado/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

