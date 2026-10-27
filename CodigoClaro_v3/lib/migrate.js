'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const REQUIRED_COLUMNS = {
  learning_topics: ['id', 'slug', 'name', 'description', 'created_at'],
  learning_questions: ['id', 'topic_id', 'prompt', 'options_json', 'correct_index', 'explanation', 'difficulty', 'active', 'updated_at'],
  users: ['id', 'email', 'display_name', 'password_hash', 'role', 'consent_at', 'created_at', 'last_login_at'],
  progress: ['user_id', 'xp', 'completed_json', 'attempts_json', 'planner_json', 'snippets_json', 'updated_at'],
  activity: ['id', 'user_id', 'event_type', 'detail_json', 'created_at'],
  spaced_reviews: ['id', 'user_id', 'topic', 'interval_days', 'repetitions', 'last_pct', 'last_reviewed', 'due_at', 'updated_at'],
  quiz_attempts: ['id', 'user_id', 'topic', 'mode', 'score', 'total', 'pct', 'xp_awarded', 'answers_json', 'topic_stats_json', 'created_at'],
  weekly_goals: ['user_id', 'tests_target', 'minutes_target', 'week_start', 'updated_at'],
  study_sessions: ['id', 'user_id', 'topic', 'started_at', 'ended_at', 'duration_seconds', 'note', 'created_at'],
  feedback: ['id', 'user_id', 'kind', 'rating', 'message', 'status', 'created_at', 'resolved_at'],
  sessions: ['sid', 'user_id', 'expires', 'created_at']
};

function loadMigrations() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(name => /^\d{3}_[a-z0-9_-]+\.js$/i.test(name))
    .sort()
    .map(name => require(path.join(MIGRATIONS_DIR, name)));
}

function assertCompatibleExistingSchema(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> 'schema_migrations'").all().map(row => row.name);
  const unknown = tables.filter(name => !Object.hasOwn(REQUIRED_COLUMNS, name));
  if (unknown.length) {
    throw new Error(`La base contiene tablas no reconocidas (${unknown.join(', ')}); no se aplicaron migraciones.`);
  }
  for (const table of tables) {
    const columns = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map(row => row.name));
    const missing = REQUIRED_COLUMNS[table].filter(column => !columns.has(column));
    if (missing.length) {
      throw new Error(`La tabla ${table} no coincide con el esquema actual (faltan columnas: ${missing.join(', ')}); crea una copia de seguridad y prepara una migración revisada.`);
    }
  }
}

function runMigrations(db, migrations = loadMigrations()) {
  const ordered = migrations.slice().sort((a, b) => a.id.localeCompare(b.id));
  const ids = new Set();
  for (const migration of ordered) {
    if (!migration || typeof migration.id !== 'string' || typeof migration.up !== 'function' || ids.has(migration.id)) {
      throw new Error('La lista de migraciones contiene una definición inválida o duplicada.');
    }
    ids.add(migration.id);
  }

  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations(
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);
  const applied = new Set(db.prepare('SELECT id FROM schema_migrations').all().map(row => row.id));
  const unknown = [...applied].filter(id => !ids.has(id));
  if (unknown.length) {
    throw new Error(`La base tiene migraciones que esta versión no conoce (${unknown.join(', ')}); no se inició la aplicación.`);
  }

  const baseline = ordered.find(migration => migration.id === '001_initial_schema');
  if (baseline && !applied.has(baseline.id)) assertCompatibleExistingSchema(db);

  const newlyApplied = [];
  for (const migration of ordered) {
    if (applied.has(migration.id)) continue;
    db.exec('BEGIN IMMEDIATE');
    try {
      // Otro proceso puede haber aplicado esta migración mientras este esperaba el bloqueo de escritura.
      if (db.prepare('SELECT 1 FROM schema_migrations WHERE id=?').get(migration.id)) {
        db.exec('COMMIT');
        applied.add(migration.id);
        continue;
      }
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations(id) VALUES(?)').run(migration.id);
      db.exec('COMMIT');
      newlyApplied.push(migration.id);
      applied.add(migration.id);
    } catch (error) {
      try { db.exec('ROLLBACK'); } catch {}
      throw error;
    }
  }
  return newlyApplied;
}

module.exports = { loadMigrations, runMigrations };

