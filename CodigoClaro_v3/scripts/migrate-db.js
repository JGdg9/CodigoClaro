'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { runMigrations } = require('../lib/migrate');

const ROOT = path.resolve(__dirname, '..');
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !match[1].startsWith('#') && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  }
}

const configuredPath = process.env.DB_PATH || path.join(ROOT, 'data', 'codigoclaro.sqlite');
const dbPath = path.resolve(ROOT, configuredPath);
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
try {
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
  const applied = runMigrations(db);
  process.stdout.write(applied.length ? `Migraciones aplicadas: ${applied.join(', ')}\n` : 'El esquema ya está actualizado.\n');
} finally {
  db.close();
}

