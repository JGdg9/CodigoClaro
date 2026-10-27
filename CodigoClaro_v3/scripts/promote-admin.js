'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

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

function promoteAdmin() {
  const configuredEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const requestedEmail = (process.argv[2] || '').trim().toLowerCase();
  if (process.argv.length !== 4 || process.argv[3] !== '--confirm') {
    throw new Error('Uso: node scripts/promote-admin.js <ADMIN_EMAIL> --confirm');
  }
  if (!configuredEmail || requestedEmail !== configuredEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
    throw new Error('El correo indicado debe coincidir con ADMIN_EMAIL.');
  }

  const configuredPath = process.env.DB_PATH || path.join(ROOT, 'data', 'codigoclaro.sqlite');
  const dbPath = path.resolve(ROOT, configuredPath);
  if (!fs.existsSync(dbPath)) {
    throw new Error('No existe la base configurada; no se creó ningún archivo.');
  }

  const db = new DatabaseSync(dbPath);
  try {
    db.exec('BEGIN IMMEDIATE');
    try {
      const user = db.prepare('SELECT id,role FROM users WHERE email=?').get(configuredEmail);
      if (!user) throw new Error('Registra primero la cuenta configurada en ADMIN_EMAIL.');
      if (user.role !== 'admin') {
        db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
        db.prepare('INSERT INTO activity(user_id,event_type,detail_json) VALUES(?,?,?)')
          .run(user.id, 'admin_promoted', JSON.stringify({ source: 'operator_cli' }));
      }
      db.exec('COMMIT');
      process.stdout.write(user.role === 'admin' ? 'La cuenta ya tiene el rol de administración.\n' : 'Cuenta promovida a administración.\n');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  } finally {
    db.close();
  }
}

try {
  promoteAdmin();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
