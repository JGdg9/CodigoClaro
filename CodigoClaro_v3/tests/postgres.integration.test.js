/** CódigoClaro — Pruebas reales de integración PostgreSQL; solo se activan contra una base de datos de pruebas explícita. */
'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const testUrl = process.env.TEST_DATABASE_URL || '';
const safeTestDb = /(?:test|testing|ci|codigoclaro_test)/i.test((()=>{try{return new URL(testUrl).pathname}catch{return ''}})());
const enabled = Boolean(testUrl && safeTestDb && process.env.RUN_POSTGRES_INTEGRATION === '1');
let proc, base, pg;
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'cc-pg-integration-'));
async function req(route,{method='GET',body,cookie=''}={}) {const headers={};if(body!==undefined)headers['content-type']='application/json';if(cookie)headers.cookie=cookie;if(base)headers.origin=base;const r=await fetch(base+route,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});const sc=r.headers.get('set-cookie');const out={status:r.status,headers:r.headers,data:null,cookie:sc?sc.split(';')[0]:cookie};try{out.data=await r.json()}catch{}return out;}
const skipReason='Configura TEST_DATABASE_URL con una base cuyo nombre contenga test, RUN_POSTGRES_INTEGRATION=1 y pg instalado.';
const maybeTest=(name,fn)=>enabled?test(name,fn):test(name,{skip:skipReason},fn);
before(async()=>{if(!enabled)return;pg=require('pg');const pool=new pg.Pool({connectionString:testUrl,ssl:process.env.PGSSLMODE==='disable'?false:{rejectUnauthorized:true}});const migrationDir=path.join(__dirname,'..','migrations'),migrationFiles=fs.readdirSync(migrationDir).filter(name=>/^\d{3}_[a-z0-9_-]+\.sql$/i.test(name)).sort();for(const migrationFile of migrationFiles)await pool.query(fs.readFileSync(path.join(migrationDir,migrationFile),'utf8'));await pool.query('DELETE FROM users WHERE email LIKE $1',['integration-%@codigoclaro.test']);await pool.end();const port=await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p));});});base=`http://127.0.0.1:${port}`;proc=spawn(process.execPath,['server-postgres.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,DATABASE_URL:testUrl,PORT:String(port),NODE_ENV:'test',REGISTRATION_OPEN:'true',SESSION_SECRET:'integration-test-secret-not-for-production-000000000000',ADMIN_EMAIL:'integration-admin@codigoclaro.test',PGSSLMODE:process.env.PGSSLMODE||'disable'},stdio:['ignore','pipe','pipe']});let logs='';proc.stdout.on('data',x=>logs+=x);proc.stderr.on('data',x=>logs+=x);for(let i=0;i<100;i++){if(proc.exitCode!==null)throw new Error('Backend PostgreSQL no arrancó: '+logs);try{if((await fetch(base+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw new Error('Timeout iniciando backend PostgreSQL: '+logs);});
after(async()=>{if(proc&&proc.exitCode===null){proc.kill('SIGTERM');await new Promise(r=>{const t=setTimeout(r,1500);proc.once('exit',()=>{clearTimeout(t);r();});});}if(enabled&&pg){const pool=new pg.Pool({connectionString:testUrl,ssl:process.env.PGSSLMODE==='disable'?false:{rejectUnauthorized:true}});await pool.query('DELETE FROM users WHERE email LIKE $1',['integration-%@codigoclaro.test']);await pool.end();}fs.rmSync(temp,{recursive:true,force:true});});
maybeTest('PostgreSQL health, config y recursos estáticos',async()=>{const h=await req('/api/health');assert.equal(h.status,200);assert.equal(h.data.database,'postgresql');assert.deepEqual((await req('/api/config')).data,{registrationOpen:true});assert.equal((await req('/')).status,200);assert.equal((await req('/server.js')).status,404);});
maybeTest('registro, login, renovación de sesión y autenticación válida', async () => {
  const email = `integration-${Date.now()}@codigoclaro.test`;
  let r = await req('/api/register', { method: 'POST', body: { email, password: 'TestPassword!2026', name: 'Integración', consent: true } });
  assert.equal(r.status, 201);
  const cookie = r.cookie;
  assert.ok(cookie.includes('cc.sid='));
  const sid = cookie.slice('cc.sid='.length).split('.')[0];
  const pool = new pg.Pool({ connectionString: testUrl, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: true } });
  try {
    await pool.query("UPDATE sessions SET expires_at=NOW()+INTERVAL '1 second' WHERE sid=$1", [sid]);
    r = await req('/api/me', { cookie });
    assert.equal(r.status, 200);
    assert.equal(r.data.user.email, email);
    assert.ok(r.headers.get('set-cookie'), 'la sesión activa debe renovar también la cookie');
    const { rows: [session] } = await pool.query("SELECT expires_at>NOW()+INTERVAL '6 days' AS renewed FROM sessions WHERE sid=$1", [sid]);
    assert.equal(session.renewed, true, 'la sesión activa debe ampliar su caducidad');
  } finally { await pool.end(); }

  r = await req('/api/login', { method: 'POST', body: { email, password: 'TestPassword!2026' } });
  assert.equal(r.status, 200);
  assert.ok(r.cookie.includes('cc.sid='));
  r = await req('/api/login', { method: 'POST', body: { email, password: 'incorrecta' } });
  assert.equal(r.status, 401);

  const port = await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const chosen = server.address().port;
      server.close(error => error ? reject(error) : resolve(chosen));
    });
  });
  const closedBase = `http://127.0.0.1:${port}`;
  const closedOrigin = `https://127.0.0.1:${port}`;
  const closedEnv = {
    ...process.env,
    DATABASE_URL: testUrl,
    PORT: String(port),
    NODE_ENV: 'production',
    SESSION_SECRET: 'integration-test-secret-not-for-production-000000000000',
    PGSSLMODE: process.env.PGSSLMODE || 'disable'
  };
  delete closedEnv.REGISTRATION_OPEN;
  closedEnv.PUBLIC_REGISTRATION_ENABLED = 'true';
  const closedProc = spawn(process.execPath, ['server-postgres.js'], {
    cwd: path.resolve(__dirname, '..'),
    env: closedEnv,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  closedProc.stdout.on('data', chunk => { logs += chunk.toString(); });
  closedProc.stderr.on('data', chunk => { logs += chunk.toString(); });
  try {
    let health = null;
    for (let i = 0; i < 100; i++) {
      if (closedProc.exitCode !== null) throw new Error(`Backend PostgreSQL cerrado no arrancó: ${logs}`);
      try {
        const response = await fetch(`${closedBase}/api/health`);
        if (response.ok) { health = await response.json(); break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(health?.registrationEnabled, false, logs);
    const configResponse = await fetch(closedBase + '/api/config');
    assert.equal(configResponse.status, 200);
    assert.deepEqual(await configResponse.json(), { registrationOpen: false });
    const existing = await fetch(`${closedBase}/api/me`, { headers: { cookie } });
    assert.equal(existing.status, 200);
    assert.equal((await existing.json()).user.email, email);
    const closedEmail = `integration-closed-${Date.now()}@codigoclaro.test`;
    const denied = await fetch(`${closedBase}/api/register`, {
      method: 'POST',
      headers: { origin: closedOrigin, 'content-type': 'application/json' },
      body: JSON.stringify({ email: closedEmail, password: 'TestPassword!2026', name: 'Cierre', consent: true })
    });
    assert.equal(denied.status, 503);
    const stillWorks = await fetch(`${closedBase}/api/login`, {
      method: 'POST',
      headers: { origin: closedOrigin, 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'TestPassword!2026' })
    });
    assert.equal(stillWorks.status, 200);
    const countPool = new pg.Pool({ connectionString: testUrl, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: true } });
    try {
      const { rows: [closedCount] } = await countPool.query('SELECT COUNT(*)::int AS count FROM users WHERE email=$1', [closedEmail]);
      assert.equal(closedCount.count, 0);
    } finally { await countPool.end(); }
  } finally {
    if (closedProc.exitCode === null) {
      closedProc.kill('SIGTERM');
      await new Promise(resolve => {
        const timeout = setTimeout(resolve, 2000);
        closedProc.once('exit', () => { clearTimeout(timeout); resolve(); });
      });
    }
  }
});
maybeTest('cuestionarios y envío de resultados persistidos',async()=>{const email=`integration-quiz-${Date.now()}@codigoclaro.test`;const r=await req('/api/register',{method:'POST',body:{email,password:'TestPassword!2026',name:'Quiz Test',consent:true}});const cookie=r.cookie;const bank=await req('/api/quiz?count=3');assert.equal(bank.status,200);assert.ok(bank.data.questions.length>0);const q=bank.data.questions[0];const submit=await req('/api/quiz/submit',{method:'POST',cookie,body:{topic:q.topic,answers:[{id:q.id,answer:0}]}});assert.equal(submit.status,201);const progress=await req('/api/progress',{cookie});assert.equal(progress.status,200);assert.equal(progress.data.progress.attempts.length,1);});
maybeTest('tareas aisladas por usuario y estadísticas',async()=>{const email=`integration-task-${Date.now()}@codigoclaro.test`;const r=await req('/api/register',{method:'POST',body:{email,password:'TestPassword!2026',name:'Task Test',consent:true}});const cookie=r.cookie;let task=await req('/api/tasks',{method:'POST',cookie,body:{title:'Repasar SQL',notes:'Prueba'}});assert.equal(task.status,201);const id=task.data.task.id;task=await req('/api/tasks/'+id,{method:'PATCH',cookie,body:{completed:true}});assert.equal(task.status,200);assert.ok(task.data.task.completedAt);const stats=await req('/api/stats/overview',{cookie});assert.equal(stats.status,200);assert.equal(stats.data.tasks.completed,1);});
maybeTest('validación y aislamiento de tareas',async()=>{const email=`integration-owner-${Date.now()}@codigoclaro.test`;const r=await req('/api/register',{method:'POST',body:{email,password:'TestPassword!2026',name:'Owner',consent:true}});const other=await req('/api/register',{method:'POST',body:{email:`integration-other-${Date.now()}@codigoclaro.test`,password:'TestPassword!2026',name:'Other',consent:true}});let bad=await req('/api/tasks',{method:'POST',cookie:r.cookie,body:{title:' '}});assert.equal(bad.status,400);const task=await req('/api/tasks',{method:'POST',cookie:r.cookie,body:{title:'Privada'}});const leak=await req('/api/tasks/'+task.data.task.id,{method:'PATCH',cookie:other.cookie,body:{completed:true}});assert.equal(leak.status,404);});
