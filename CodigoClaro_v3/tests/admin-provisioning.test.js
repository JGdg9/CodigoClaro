const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'promote-admin.js');

test('la promoción administrativa es explícita, limitada al correo configurado y auditable', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-admin-provisioning-'));
  const dbPath = path.join(temp, 'test.sqlite');
  const configuredEmail = 'admin@codigoclaro.test';
  const db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL);
    CREATE TABLE activity(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, event_type TEXT NOT NULL, detail_json TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);
  db.prepare('INSERT INTO users(id,email,role) VALUES(1,?,?)').run(configuredEmail, 'student');
  db.prepare('INSERT INTO users(id,email,role) VALUES(2,?,?)').run('student@codigoclaro.test', 'student');
  db.close();

  const env = { ...process.env, DB_PATH: dbPath, ADMIN_EMAIL: configuredEmail };
  const run = (email, confirm = true) => spawnSync(process.execPath, [script, email, ...(confirm ? ['--confirm'] : [])], { cwd: root, env, encoding: 'utf8' });
  try {
    assert.notEqual(run(configuredEmail, false).status, 0, 'sin confirmación no debe modificar el rol');
    assert.notEqual(run('student@codigoclaro.test').status, 0, 'no debe promover una cuenta distinta de ADMIN_EMAIL');
    assert.notEqual(run('missing@codigoclaro.test').status, 0, 'no debe crear ni promover cuentas inexistentes');
    assert.equal(run(configuredEmail).status, 0);
    assert.equal(run(configuredEmail).status, 0, 'repetir el comando es seguro');

    const check = new DatabaseSync(dbPath);
    assert.equal(check.prepare('SELECT role FROM users WHERE email=?').get(configuredEmail).role, 'admin');
    assert.equal(check.prepare("SELECT COUNT(*) AS n FROM activity WHERE event_type='admin_promoted'").get().n, 1);
    assert.equal(check.prepare('SELECT role FROM users WHERE email=?').get('student@codigoclaro.test').role, 'student');
    check.close();
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
