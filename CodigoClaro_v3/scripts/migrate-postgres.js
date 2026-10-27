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
    const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_postgres_core.sql'), 'utf8');
    // La migración contiene su propia transacción; todas sus sentencias usan este mismo cliente.
    await client.query(sql);
    console.log('Migración 001_postgres_core aplicada/verificada.');
  } finally { client.release(); await pool.end(); }
})().catch(async err => { console.error('Falló la migración; revisa DATABASE_URL y permisos.'); console.error(err.message); await pool.end().catch(()=>{}); process.exit(1); });
