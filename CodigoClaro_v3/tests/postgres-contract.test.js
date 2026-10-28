/** CódigoClaro — Comprueba contratos y estructura del backend PostgreSQL sin necesitar un servidor de base de datos. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const sql=fs.readFileSync(path.join(root,'migrations','001_postgres_core.sql'),'utf8');
const server=fs.readFileSync(path.join(root,'server-postgres.js'),'utf8');
const sqlite=fs.readFileSync(path.join(root,'server.js'),'utf8');
const frontend=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
test('backend PostgreSQL es opt-in y no reemplaza el servidor SQLite actual',()=>{const pkg=require('../package.json');assert.equal(pkg.scripts.start,'node server.js');assert.equal(pkg.scripts['start:postgres'],'node server-postgres.js');assert.ok(fs.existsSync(path.join(root,'server.js')));});
test('migración PostgreSQL define tablas de usuarios, cursos, preguntas, resultados, progreso, tareas y sesiones',()=>{for(const table of ['users','sessions','courses','course_lessons','questions','quiz_attempts','lesson_progress','study_tasks','study_sessions','schema_migrations'])assert.match(sql,new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`));});
test('migración es repetible y no contiene órdenes destructivas',()=>{assert.match(sql,/ON CONFLICT DO NOTHING/);assert.match(sql,/CREATE INDEX IF NOT EXISTS/);assert.doesNotMatch(sql,/\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i);assert.doesNotMatch(sql,/\bTRUNCATE\b/i);});
test('backend usa consultas parametrizadas y separa tareas por usuario',()=>{assert.match(server,/pool\.query\('DELETE FROM study_tasks WHERE id=\$1 AND user_id=\$2'/);assert.match(server,/WHERE id=\$1 AND user_id=\$2(?: AND [^']+)? RETURNING/);assert.match(server,/crypto\.timingSafeEqual/);assert.match(server,/password_hash/);});
test('rutas principales y configuración de registro conservan el contrato público', () => {
  for (const route of ['/api/config', '/api/register', '/api/login', '/api/logout', '/api/courses', '/api/admin/courses', '/api/quiz', '/api/quiz/submit', '/api/progress', '/api/progress/lesson', '/api/tasks', '/api/study/sessions', '/api/stats/overview']) {
    assert.ok(server.includes(route), 'Falta ruta ' + route);
  }
  assert.match(server, /if\(!REGISTRATION_OPEN\)return fail\(res,503/);
  assert.match(server, /route==='\/api\/config'\)return json\(res,200,\{registrationOpen:REGISTRATION_OPEN\}\)/);
  assert.match(server, /registrationEnabled:REGISTRATION_OPEN/);
  assert.match(server, /REGISTRATION_OPEN\s*=\s*process\.env\.REGISTRATION_OPEN\s*===\s*'true'/);
  assert.doesNotMatch(server, /PUBLIC_REGISTRATION_ENABLED/);
  assert.match(sqlite, /if\(!REGISTRATION_OPEN\)return fail\(res,503/);
  assert.match(sqlite, /route==='\/api\/config'\)return json\(res,200,\{registrationOpen:REGISTRATION_OPEN\}\)/);
  assert.match(sqlite, /registrationEnabled:REGISTRATION_OPEN/);
  assert.match(sqlite, /REGISTRATION_OPEN=process\.env\.REGISTRATION_OPEN==='true'/);
  assert.doesNotMatch(sqlite, /PUBLIC_REGISTRATION_ENABLED/);
  assert.match(sqlite, /trustCloudflare=process\.env\.TRUST_CF_CONNECTING_IP==='true'/);
  assert.match(server, /trustCloudflare = process\.env\.TRUST_CF_CONNECTING_IP === 'true'/);
  assert.match(sqlite, /limitRegister=createRateLimiter\(\{trustCloudflare\}\),limitLogin=createRateLimiter\(\{trustCloudflare\}\),limitFeedback=createRateLimiter\(\{trustCloudflare\}\)/);
  assert.match(server, /limitRegister = createRateLimiter\(\{ trustCloudflare \}\)/);
  assert.match(sqlite, /limitRegister\(req,8\)/);
  assert.match(server, /limitRegister\(req,8\)/);
  assert.match(sqlite, /limitLogin\(req,10\)/);
  assert.match(server, /limitLogin\(req,10\)/);
});
test('PostgreSQL rechaza el secreto de sesión de ejemplo en producción sin distinguir mayúsculas',()=>{assert.match(server,/SESSION_SECRET\.length < 32 \|\| SESSION_SECRET\.toUpperCase\(\)\.startsWith\('CAMBIA_ESTO'\)/);});
test('health comprueba la base y responde 503 si una consulta falla en ambos backends',()=>{assert.match(sqlite,/route==='\/api\/health'[\s\S]*?db\.prepare\('SELECT 1'\)\.get\(\)[\s\S]*?fail\(res,503/);assert.match(server,/route==='\/api\/health'[\s\S]*?pool\.query\('SELECT 1'\)[\s\S]*?fail\(res,503/);});
test('la interfaz no promete que el login funcione durante una caída del servicio',()=>{assert.match(frontend,/Las cuentas existentes podrán iniciar sesión cuando el servicio esté disponible/);assert.match(frontend,/No se pudo confirmar el estado del registro/);assert.doesNotMatch(frontend,/El inicio de sesión sigue disponible/);});
test('las sesiones activas de PostgreSQL renuevan caducidad y cookie',()=>{assert.match(server,/async function currentUser\(req,res\)[\s\S]*?UPDATE sessions SET expires_at=NOW\(\)\+INTERVAL '7 days'[\s\S]*?Set-Cookie/);assert.match(server,/currentUser\(req,res\)/);});
test('escrituras de progreso se serializan por usuario y el snapshot conserva posiciones e historial validado',()=>{assert.match(server,/async function lockProgressUser\(client,userId\)[\s\S]*?FOR UPDATE/);assert.equal((server.match(/await lockProgressUser\(client,u\.id\)/g)||[]).length,2);const start=server.indexOf("if(method==='PUT'&&route==='/api/progress')"),end=server.indexOf("if(method==='PUT'&&route==='/api/progress/lesson')",start);assert.ok(start>=0&&end>start,'debe existir la ruta de snapshot');const snapshot=server.slice(start,end);assert.match(snapshot,/client\.query\('BEGIN'\)/);assert.match(snapshot,/completed\.length>2000/);assert.match(snapshot,/NOT \(lesson_key=ANY\(\$2::text\[\]\)\)/);assert.match(snapshot,/ON CONFLICT\(user_id,lesson_key\) DO UPDATE SET completed_at=NOW\(\),updated_at=NOW\(\)/);assert.doesNotMatch(snapshot,/last_position\s*=|quiz_attempts|quiz_question_rewards|xp_awarded/i);});
test('los despliegues declaran explícitamente el proxy confiable para los límites de solicitudes',()=>{assert.ok(fs.existsSync(path.join(root,'render-postgres.yaml')));const current=fs.readFileSync(path.join(root,'render.yaml'),'utf8');const postgres=fs.readFileSync(path.join(root,'render-postgres.yaml'),'utf8');assert.match(current,/codigoclaro-data/);assert.match(current,/TRUST_CF_CONNECTING_IP[\s\S]*?value: "true"/);assert.match(postgres,/TRUST_CF_CONNECTING_IP[\s\S]*?value: "true"/);});
