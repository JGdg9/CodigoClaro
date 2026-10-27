/** CódigoClaro — Comprueba contratos y estructura del backend PostgreSQL sin necesitar un servidor de base de datos. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const sql=fs.readFileSync(path.join(root,'migrations','001_postgres_core.sql'),'utf8');
const server=fs.readFileSync(path.join(root,'server-postgres.js'),'utf8');
test('backend PostgreSQL es opt-in y no reemplaza el servidor SQLite actual',()=>{const pkg=require('../package.json');assert.equal(pkg.scripts.start,'node server.js');assert.equal(pkg.scripts['start:postgres'],'node server-postgres.js');assert.ok(fs.existsSync(path.join(root,'server.js')));});
test('migración PostgreSQL define tablas de usuarios, cursos, preguntas, resultados, progreso, tareas y sesiones',()=>{for(const table of ['users','sessions','courses','course_lessons','questions','quiz_attempts','lesson_progress','study_tasks','study_sessions','schema_migrations'])assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));});
test('migración es repetible y no contiene órdenes destructivas',()=>{assert.match(sql,/ON CONFLICT DO NOTHING/);assert.match(sql,/CREATE INDEX IF NOT EXISTS/);assert.doesNotMatch(sql,/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i);assert.doesNotMatch(sql,/\bTRUNCATE\b/i);});
test('backend usa consultas parametrizadas y separa tareas por usuario',()=>{assert.match(server,/pool\.query\('DELETE FROM study_tasks WHERE id=\$1 AND user_id=\$2'/);assert.match(server,/WHERE id=\$1 AND user_id=\$2(?: AND [^']+)? RETURNING/);assert.match(server,/crypto\.timingSafeEqual/);assert.match(server,/password_hash/);});
test('rutas principales de backend cubren cuentas, cursos, tests, progreso, tareas y estadísticas',()=>{for(const route of ['/api/register','/api/login','/api/logout','/api/courses','/api/admin/courses','/api/quiz','/api/quiz/submit','/api/progress','/api/progress/lesson','/api/tasks','/api/study/sessions','/api/stats/overview'])assert.ok(server.includes(route),`Falta ruta ${route}`);});
test('configuración de Render PostgreSQL es separada de render.yaml',()=>{assert.ok(fs.existsSync(path.join(root,'render-postgres.yaml')));const current=fs.readFileSync(path.join(root,'render.yaml'),'utf8');assert.match(current,/codigoclaro-data/);});
