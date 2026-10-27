/** CódigoClaro — Aplica las migraciones SQL versionadas a la base PostgreSQL configurada. No ejecutar contra producción sin copia de seguridad y revisión previa. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
if (!process.env.DATABASE_URL) { console.error('Falta DATABASE_URL. No se ha modificado ninguna base de datos.'); process.exit(2); }
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: true }, max: 1, connectionTimeoutMillis: 8000 });
(async () => {
  const client = await pool.connect();
  try {
    const migrationDir = path.join(__dirname, '..', 'migrations');
    const migrations = fs.readdirSync(migrationDir).filter(name => /^\d{3}_[a-z0-9_-]+\.sql$/i.test(name)).sort();
    for (const name of migrations) {
      const sql = fs.readFileSync(path.join(migrationDir, name), 'utf8');
      // Cada archivo SQL contiene su propia transacción y se aplica en orden con este cliente.
      await client.query(sql);
      console.log('Migración ' + name + ' aplicada/verificada.');
    }
  } finally { client.release(); await pool.end(); }
})().catch(async err => { console.error('Falló la migración; revisa DATABASE_URL y permisos.'); console.error(err.message); await pool.end().catch(()=>{}); process.exit(1); });
