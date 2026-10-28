/** CódigoClaro — Pruebas de flujo API y regresión de funcionalidades del servidor principal. */
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const vm = require('node:vm');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

let port;
let base;
let temp;
let proc;
let adminCookie = '';
let studentCookie = '';

async function waitServer() {
  for (let i=0; i<120; i++) {
    if (proc.exitCode !== null) throw new Error('El servidor de pruebas se cerró antes de arrancar.');
    try { const r = await fetch(base + '/api/health'); if (r.ok) return; } catch {}
    await new Promise(r=>setTimeout(r,150));
  }
  throw new Error('Tiempo agotado esperando el servidor de pruebas.');
}
async function request(route, { method='GET', body, cookie='', expectedOrigin=true, accept }={}) {
  const headers = {};
  if (accept) headers.accept=accept;
  if (body !== undefined) headers['content-type']='application/json';
  if (cookie) headers.cookie=cookie;
  if (expectedOrigin) headers.origin=base;
  const res = await fetch(base+route, {method, headers, body:body===undefined?undefined:JSON.stringify(body)});
  const setCookie=res.headers.get('set-cookie');
  const cookieOut=setCookie?setCookie.split(';')[0]:cookie;
  let data={},textBody='';try{if((res.headers.get('content-type')||'').includes('application/json'))data=await res.json();else textBody=await res.text()}catch{}
  return {res,data,text:textBody,cookie:cookieOut};
}

describe('API SQLite', () => {
before(async () => {
  temp=fs.mkdtempSync(path.join(os.tmpdir(), 'cc-pilot-test-'));
  port = await new Promise((resolve,reject)=>{const srv=net.createServer();srv.once('error',reject);srv.listen(0,'127.0.0.1',()=>{const p=srv.address().port;srv.close(()=>resolve(p))})});
  base=`http://127.0.0.1:${port}`;
  proc=spawn(process.execPath,['server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),DB_PATH:path.join(temp,'test.sqlite'),SESSION_SECRET:'test-only-secret-that-is-longer-than-thirty-two-characters',ADMIN_EMAIL:'admin@codigoclaro.test',NODE_ENV:'development'},stdio:['ignore','pipe','pipe']});
  let output='';proc.stdout.on('data',b=>output+=b.toString());proc.stderr.on('data',b=>output+=b.toString());
  try { await waitServer(); }
  catch(e){throw new Error(e.message+' Salida: '+output)}
});
after(async () => { if(proc && proc.exitCode===null) { proc.kill('SIGTERM'); await new Promise(r=>{const t=setTimeout(r,1500);proc.once('exit',()=>{clearTimeout(t);r()})}); } fs.rmSync(temp,{recursive:true,force:true}); });

test('cabeceras de caché y página 404 para navegación pública', async () => {
  const home = await request('/');
  assert.equal(home.res.headers.get('cache-control'), 'no-cache');
  const health = await request('/api/health');
  assert.equal(health.res.headers.get('cache-control'), 'no-store');
  const pdf = await request('/temarios/Java_Tema_01.pdf');
  assert.equal(pdf.res.status, 200);
  assert.equal(pdf.res.headers.get('cache-control'), 'public, max-age=300');
  const missing = await request('/ruta-inexistente-de-prueba', { accept: 'text/html' });
  assert.equal(missing.res.status, 404);
  assert.match(missing.res.headers.get('content-type'), /text\/html/);
  assert.equal(missing.res.headers.get('cache-control'), 'no-store');
  assert.match(missing.text, /Esta página no está disponible/);
  const missingApi = await request('/api/ruta-inexistente-de-prueba');
  assert.equal(missingApi.res.status, 404);
  assert.match(missingApi.res.headers.get('content-type'), /application\/json/);
  assert.equal(missingApi.res.headers.get('cache-control'), 'no-store');
});

test('flujo de usuario piloto: registro, sesión, progreso, test, feedback y administración', async () => {
  const home=await request('/');assert.equal(home.res.status,200);assert.match(home.res.headers.get('content-type'),/text\/html/);
  const hidden=await request('/server.js');assert.equal(hidden.res.status,404);
  const noOrigin=await request('/api/register',{method:'POST',expectedOrigin:false,body:{email:'sin-origen@codigoclaro.test',password:'UnaClaveDePrueba_2026!',name:'Sin origen',consent:true}});assert.equal(noOrigin.res.status,403,'las escrituras API deben rechazar peticiones sin origen');
  let r=await request('/api/health');assert.equal(r.res.status,200);assert.equal(r.data.ok,true);assert.equal(r.data.version,require('../package.json').version);assert.ok(r.data.features.includes('quiz-attempts'));assert.ok(r.data.features.includes('admin-content-crud'));assert.ok(r.data.features.includes('topic-learning-statistics'));assert.ok(r.data.features.includes('question-bank-json-import-export'));assert.ok(r.data.features.includes('student-learning-statistics-ui'));assert.ok(r.data.features.includes('date-based-learning-trends'));assert.ok(r.data.features.includes('technology-comparison'));assert.ok(r.data.features.includes('weekly-learning-goals'));assert.ok(r.data.features.includes('persistent-study-timer'));assert.ok(r.data.features.includes('study-session-history'));
  r=await request('/api/catalog');assert.equal(r.res.status,200);assert.equal(r.data.topics.length,75);assert.ok(r.data.docs.length>=5);assert.ok(r.data.topics.every(t=>t.title&&t.description&&Number.isInteger(t.pages)&&t.pages>0&&t.pages<10&&t.version==='2.0'));assert.equal(r.data.topics.find(t=>t.id==='Python_Tema_01').title,'Instalación y primer programa');assert.match(r.data.topics.find(t=>t.id==='Python_Tema_01').url,/^\/temarios\/Python_Tema_01\.pdf$/,'la API debe usar la carpeta organizada de temarios');
  r=await request('/api/learning/topics');assert.equal(r.res.status,200);assert.ok(r.data.topics.length>=12);assert.ok(r.data.totalQuestions>=30);assert.ok(r.data.topics.every(t=>Number.isInteger(t.questionCount)&&t.slug));const javaTopic=r.data.topics.find(t=>t.name==='Java');assert.ok(javaTopic&&javaTopic.questionCount>0);r=await request('/api/learning/topics/'+javaTopic.slug);assert.equal(r.res.status,200);assert.equal(r.data.topic.name,'Java');assert.equal(r.data.questionCount,javaTopic.questionCount);r=await request('/api/learning/topics/no-existe');assert.equal(r.res.status,404);

  r=await request('/api/register',{method:'POST',body:{email:'admin@codigoclaro.test',password:'UnaClaveDePrueba_2026!',name:'Admin piloto',consent:true}});
  assert.equal(r.res.status,201,JSON.stringify(r.data));assert.equal(r.data.user.role,'student','ADMIN_EMAIL no debe dar privilegios durante el registro público');assert.ok(r.cookie.includes('cc.sid='));
  const promotion=spawnSync(process.execPath,['scripts/promote-admin.js','admin@codigoclaro.test','--confirm'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,ADMIN_EMAIL:'admin@codigoclaro.test',DB_PATH:path.join(temp,'test.sqlite')},encoding:'utf8'});
  assert.equal(promotion.status,0,promotion.stderr||promotion.stdout);
  r=await request('/api/login',{method:'POST',body:{email:'admin@codigoclaro.test',password:'UnaClaveDePrueba_2026!',}});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.equal(r.data.user.role,'admin');adminCookie=r.cookie;
  r=await request('/api/admin/learning/topics',{method:'POST',cookie:studentCookie,body:{name:'Tema prohibido'}});assert.equal(r.res.status,401,'la API de administración exige sesión');
  r=await request('/api/admin/learning/topics',{cookie:adminCookie});assert.equal(r.res.status,200);assert.ok(r.data.topics.length>=12);
  r=await request('/api/admin/learning/topics',{method:'POST',cookie:adminCookie,body:{name:'Tema de prueba CRUD',description:'Tema temporal para probar la API'}});assert.equal(r.res.status,201,JSON.stringify(r.data));const crudTopic=r.data.topic;assert.ok(crudTopic.id&&crudTopic.slug);
  r=await request('/api/admin/learning/topics',{method:'POST',cookie:adminCookie,body:{name:'Tema de prueba CRUD'}});assert.equal(r.res.status,409,'no debe permitir temas duplicados');
  r=await request('/api/admin/learning/questions',{method:'POST',cookie:adminCookie,body:{id:'crud-question-1',topicId:crudTopic.id,prompt:'¿Cuánto es 2 + 2?',options:['3','4','5'],correctIndex:1,explanation:'Suma básica',difficulty:'basic'}});assert.equal(r.res.status,201,JSON.stringify(r.data));assert.equal(r.data.question.correctIndex,1);
  r=await request('/api/admin/learning/questions?search=crud-question-1',{cookie:adminCookie});assert.equal(r.res.status,200);assert.ok(r.data.questions.some(q=>q.id==='crud-question-1'));assert.ok(!('password_hash' in r.data.questions[0]));
  r=await request('/api/admin/learning/questions/crud-question-1',{method:'PATCH',cookie:adminCookie,body:{prompt:'¿Cuánto es 2 + 2? (editada)',active:true}});assert.equal(r.res.status,200);assert.equal(r.data.question.prompt,'¿Cuánto es 2 + 2? (editada)');
  r=await request('/api/admin/learning/topics/'+crudTopic.id,{method:'PATCH',cookie:adminCookie,body:{description:'Descripción editada'}});assert.equal(r.res.status,200);assert.equal(r.data.topic.description,'Descripción editada');
  r=await request('/api/admin/learning/topics/'+crudTopic.id,{method:'DELETE',cookie:adminCookie,body:{}});assert.equal(r.res.status,409,'no debe borrar temas con preguntas');
  r=await request('/api/admin/learning/questions/crud-question-1',{method:'DELETE',cookie:adminCookie,body:{}});assert.equal(r.res.status,200);assert.equal(r.data.active,false);
  r=await request('/api/admin/learning/questions?search=crud-question-1&active=false',{cookie:adminCookie});assert.equal(r.res.status,200);assert.ok(r.data.questions.some(q=>q.id==='crud-question-1'&&!q.active));
  r=await request('/api/admin/learning/questions',{method:'POST',cookie:adminCookie,body:{id:'bad',topicId:crudTopic.id,prompt:'Inválida',options:['Solo una'],correctIndex:0,difficulty:'basic'}});assert.equal(r.res.status,400,'la API debe validar las opciones de respuesta');
  r=await request('/api/admin/learning/questions.export.json');assert.equal(r.res.status,401,'exportar el banco requiere sesión');
  r=await request('/api/admin/learning/questions.export.json',{cookie:adminCookie});assert.equal(r.res.status,200);assert.equal(r.data.format,'codigoclaro-questions-v1');assert.ok(r.data.questions.some(q=>q.id==='crud-question-1'));assert.ok(Array.isArray(r.data.questions[0].options));
  const importPayload={format:'codigoclaro-questions-v1',mode:'preview',questions:[{id:'import-test-001',topic:'Tema importado prueba',prompt:'Pregunta importada?',options:['Sí','No'],correctIndex:0,explanation:'Explicación',difficulty:'basic',active:true}]};
  r=await request('/api/admin/learning/questions.import',{method:'POST',body:importPayload});assert.equal(r.res.status,401,'importar requiere sesión');
  r=await request('/api/admin/learning/questions.import',{method:'POST',cookie:adminCookie,body:importPayload});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.equal(r.data.preview,true);assert.equal(r.data.toCreate,1);
  r=await request('/api/admin/learning/questions?search=import-test-001&active=all',{cookie:adminCookie});assert.equal(r.res.status,200);assert.ok(!r.data.questions.some(q=>q.id==='import-test-001'),'la vista previa no debe escribir en la base de datos');
  const invalidImport={format:'codigoclaro-questions-v1',mode:'apply',questions:[{id:'import-invalid-001',topic:'Tema inválido',prompt:'Sin opciones',options:['Solo una'],correctIndex:0,difficulty:'basic'}]};r=await request('/api/admin/learning/questions.import',{method:'POST',cookie:adminCookie,body:invalidImport});assert.equal(r.res.status,400);assert.ok(r.data.errorCount>0);
  importPayload.mode='apply';r=await request('/api/admin/learning/questions.import',{method:'POST',cookie:adminCookie,body:importPayload});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.equal(r.data.imported,1);assert.equal(r.data.created,1);assert.equal(r.data.updated,0);
  importPayload.questions[0].prompt='Pregunta importada editada?';r=await request('/api/admin/learning/questions.import',{method:'POST',cookie:adminCookie,body:importPayload});assert.equal(r.res.status,200);assert.equal(r.data.updated,1,'un ID existente debe actualizarse en vez de duplicarse');
  r=await request('/api/admin/learning/questions?search=import-test-001&active=all',{cookie:adminCookie});assert.equal(r.res.status,200);assert.equal(r.data.questions.filter(q=>q.id==='import-test-001').length,1);assert.equal(r.data.questions.find(q=>q.id==='import-test-001').prompt,'Pregunta importada editada?');
  r=await request('/api/register',{method:'POST',body:{email:'alumno@codigoclaro.test',password:'UnaClaveDePrueba_2026!',name:'Alumno piloto',consent:true}});
  assert.equal(r.res.status,201,JSON.stringify(r.data));assert.equal(r.data.user.role,'student');studentCookie=r.cookie;
  r=await request('/api/admin/learning/questions',{cookie:studentCookie});assert.equal(r.res.status,403,'los estudiantes no pueden acceder al catálogo administrativo');
  r=await request('/api/register',{method:'POST',body:{email:'alumno@codigoclaro.test',password:'UnaClaveDePrueba_2026!',name:'Duplicado',consent:true}});assert.equal(r.res.status,409);
  r=await request('/api/progress');assert.equal(r.res.status,401);
  r=await request('/api/progress',{cookie:adminCookie});assert.equal(r.res.status,200);assert.equal(r.data.progress.xp,0,'el progreso debe estar aislado por usuario');
  r=await request('/api/me',{cookie:studentCookie});assert.equal(r.res.status,200);assert.equal(r.data.user.email,'alumno@codigoclaro.test');assert.match(r.res.headers.get('set-cookie')||'',/Max-Age=604800/,'la cookie debe renovarse junto con la caducidad deslizante del servidor');
  r=await request('/api/progress',{method:'PUT',cookie:studentCookie,body:{xp:25,completed:['Java_Tema_01'],attempts:[{id:'test1',name:'Test humo',p:80,date:'hoy'}],planner:[{id:'t1',title:'Repasar Java',day:'lunes',minutes:25,done:false}],snippets:[]}});
  assert.equal(r.res.status,200,JSON.stringify(r.data));assert.equal(r.data.progress.xp,0,'el progreso enviado por el cliente no debe conceder XP');assert.deepEqual(r.data.progress.attempts,[],'el historial solo debe contener intentos verificados en el servidor');assert.deepEqual(r.data.progress.completed,['Java_Tema_01']);assert.equal(r.data.progress.planner.length,1);
  r=await request('/api/progress',{method:'PUT',cookie:studentCookie,body:{xp:999999,completed:['Java_Tema_01'],attempts:[{id:'test2',name:'Nuevo test falso',p:100,date:'mañana'}]}});assert.equal(r.res.status,200);assert.equal(r.data.progress.xp,0,'repetir la sincronización con nuevos intentos falsos no debe aumentar XP');assert.deepEqual(r.data.progress.attempts,[]);
  r=await request('/api/quiz?count=5',{cookie:studentCookie});assert.equal(r.res.status,200);assert.ok(r.data.questions.length>=5);assert.ok(!('answer' in r.data.questions[0]));
  r=await request('/api/quiz?topics=Java%2CSQL&count=10',{cookie:studentCookie});assert.equal(r.res.status,200);assert.ok(r.data.questions.length>=5);assert.ok(r.data.questions.every(q=>['Java','SQL'].includes(q.topic)),'el repaso inteligente debe limitarse a los temas seleccionados');assert.equal(new Set(r.data.questions.map(q=>q.id)).size,r.data.questions.length,'el repaso no debe repetir preguntas');
  r=await request('/api/quiz?topic=Java&count=30',{cookie:studentCookie});assert.equal(r.res.status,200);assert.ok(r.data.questions.every(q=>q.topic==='Java'),'el test de Java debe contener únicamente preguntas de Java');assert.ok(r.data.questions.length<=30);
  r=await request('/api/quiz?count=30',{cookie:studentCookie});assert.equal(r.res.status,200);assert.equal(r.data.questions.length,30,'el banco ampliado debe permitir simulacros de 30 preguntas');assert.ok(r.data.topics.length>=12,'debe cubrir múltiples tecnologías');assert.equal(new Set(r.data.questions.map(q=>q.id)).size,r.data.questions.length,'no debe repetir preguntas dentro del mismo test');
  r=await request('/api/quiz?topic=Java&difficulty=advanced&count=25',{cookie:studentCookie});assert.equal(r.res.status,200);assert.ok(r.data.available>=1,'Java debe incluir preguntas avanzadas');assert.equal(r.data.questions.length,Math.min(r.data.requestedCount,r.data.available));assert.ok(r.data.questions.every(q=>q.difficulty==='advanced'),'el filtro no debe añadir preguntas de otros niveles');assert.ok(r.data.filterFallback,'la API debe avisar cuando no hay coincidencias suficientes para los filtros');
  // Every seeded technology must have enough questions for a useful 5-question test; filters never cross technologies.
  const allTopicsResponse=await request('/api/learning/topics');assert.equal(allTopicsResponse.res.status,200);
  const seededTopicNames=new Set(require('../lib/quizzes').map(q=>q.topic));
  for(const topic of allTopicsResponse.data.topics.filter(t=>seededTopicNames.has(t.name)&&t.questionCount>0)){
    const encoded=encodeURIComponent(topic.name);const check=await request('/api/quiz?topic='+encoded+'&count=30',{cookie:studentCookie});
    assert.equal(check.res.status,200,`API test failed for ${topic.name}`);
    assert.ok(check.data.questions.length>=5,`${topic.name} debe tener al menos 5 preguntas para realizar un test completo; tiene ${check.data.questions.length}`);
    assert.ok(check.data.questions.every(q=>q.topic===topic.name),`el test ${topic.name} mezcló preguntas de otra tecnología`);
    assert.equal(new Set(check.data.questions.map(q=>q.id)).size,check.data.questions.length,`el test ${topic.name} contiene duplicados`);
    assert.ok(check.data.questions.every(q=>!Object.hasOwn(q,'answer')&&!Object.hasOwn(q,'correctAnswer')),`el endpoint filtró respuestas de ${topic.name}`);
    const sourceQuestion=require('../lib/quizzes').find(q=>q.id===check.data.questions[0].id);assert.ok(sourceQuestion,`la pregunta de ${topic.name} debe existir en el banco fuente`);
    const correction=await request('/api/quiz/check',{method:'POST',cookie:studentCookie,body:{id:sourceQuestion.id,answer:sourceQuestion.a}});
    assert.equal(correction.res.status,200,`la corrección de ${topic.name} debe funcionar`);assert.equal(correction.data.correct,true,`la respuesta correcta de ${topic.name} debe ser aceptada`);
  }
  const checkQ=require('../lib/quizzes')[0];r=await request('/api/quiz/check',{method:'POST',cookie:studentCookie,body:{id:checkQ.id,answer:checkQ.a}});assert.equal(r.res.status,200);assert.equal(r.data.correct,true,'la corrección inmediata debe identificar la respuesta correcta');assert.equal(typeof r.data.explanation,'string');
  r=await request('/api/quiz?count=5&difficulty=basic',{cookie:studentCookie});assert.equal(r.res.status,200);assert.ok(r.data.questions.every(q=>q.difficulty==='basic'),'el filtro básico debe respetarse');
  r=await request('/api/quiz?count=5&difficulty=advanced',{cookie:studentCookie});assert.equal(r.res.status,200);const availableAdvanced=require('../lib/quizzes').filter(q=>q.difficulty==='advanced').length;assert.equal(r.data.available,availableAdvanced,'la disponibilidad debe contar solo preguntas del nivel solicitado');assert.equal(r.data.questions.length,Math.min(5,availableAdvanced),'el resultado no debe completar el cupo con otros niveles');assert.ok(r.data.questions.every(q=>q.difficulty==='advanced'),'el filtro avanzado debe respetarse');if(availableAdvanced<5)assert.ok(r.data.filterFallback,'si faltan preguntas, la API debe avisar sin ampliar los filtros');else assert.equal(r.data.filterFallback,'','con preguntas suficientes no debe avisar de un faltante');
  const qset=r.data.questions;
  r=await request('/api/quiz/submit',{method:'POST',cookie:studentCookie,body:{answers:[{id:qset[0].id,answer:0},{id:qset[0].id,answer:1}]}});assert.equal(r.res.status,400,'el servidor debe rechazar preguntas duplicadas');
  r=await request('/api/quiz/submit',{method:'POST',cookie:studentCookie,body:{answers:qset.map(q=>({id:q.id,answer:0})),topic:'all',mode:'exam'}});
  assert.equal(r.res.status,200,JSON.stringify(r.data));assert.ok(Number.isInteger(r.data.pct));assert.equal(r.data.total,r.data.results.length);assert.ok(r.data.progress.xp>=25);const latest=r.data.progress.attempts[0];assert.equal(latest.mode,'exam');assert.equal(latest.topic,'Todas las tecnologías');assert.equal(latest.total,r.data.total);assert.ok(latest.topicStats&&Object.keys(latest.topicStats).length>0,'el historial debe guardar desglose por tema');
  r=await request('/api/stats/topics');assert.equal(r.res.status,401,'las estadísticas requieren sesión');r=await request('/api/stats/topics',{cookie:studentCookie});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.ok(r.data.summary.topicsAvailable>=12);assert.ok(r.data.summary.topicsPracticed>0);assert.ok(r.data.topics.some(t=>t.questions>0&&Number.isInteger(t.accuracy)));assert.ok(r.data.topics.every(t=>Number.isInteger(t.availableQuestions)&&t.availableQuestions>=0));r=await request('/api/attempts?limit=10',{cookie:studentCookie});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.ok(Array.isArray(r.data.attempts));assert.equal(r.data.attempts.length,1,'cada entrega debe guardarse como registro persistente independiente');assert.equal(r.data.attempts[0].total,r.data.attempts[0].answers.length);assert.equal(r.data.attempts[0].topicStats&&typeof r.data.attempts[0].topicStats,'object');r=await request('/api/attempts',{cookie:adminCookie});assert.equal(r.res.status,200);assert.equal(r.data.attempts.length,0,'el historial de intentos debe estar aislado por usuario');
  r=await request('/api/stats/overview');assert.equal(r.res.status,401,'la evolución requiere sesión');r=await request('/api/stats/overview',{cookie:studentCookie});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.ok(Array.isArray(r.data.daily));assert.ok(r.data.daily.length>=1);assert.ok(Array.isArray(r.data.technologies)&&r.data.technologies.length>0);assert.ok(r.data.technologies.every(t=>Number.isInteger(t.accuracy)&&t.questions>0));assert.ok(Array.isArray(r.data.weakest));r=await request('/api/goals/weekly');assert.equal(r.res.status,401,'los objetivos requieren sesión');r=await request('/api/goals/weekly',{cookie:studentCookie});assert.equal(r.res.status,200);assert.equal(r.data.goal.testsTarget,5);r=await request('/api/goals/weekly',{method:'PUT',cookie:studentCookie,body:{testsTarget:0,minutesTarget:120}});assert.equal(r.res.status,400,'el objetivo semanal debe validar límites');r=await request('/api/goals/weekly',{method:'PUT',cookie:studentCookie,body:{testsTarget:4,minutesTarget:180}});assert.equal(r.res.status,200,JSON.stringify(r.data));r=await request('/api/goals/weekly',{cookie:studentCookie});assert.equal(r.res.status,200);assert.equal(r.data.goal.testsTarget,4,'el objetivo debe persistir en SQLite');assert.equal(r.data.goal.minutesTarget,180);r=await request('/api/study/sessions');assert.equal(r.res.status,401,'las sesiones de estudio requieren autenticación');r=await request('/api/study/sessions',{cookie:studentCookie});assert.equal(r.res.status,200);assert.equal(r.data.totals.weekMinutes,0);r=await request('/api/study/sessions/start',{method:'POST',cookie:studentCookie,body:{topic:'Java',note:'Colecciones'}});assert.equal(r.res.status,201,JSON.stringify(r.data));const studyId=r.data.session.id;r=await request('/api/study/sessions/start',{method:'POST',cookie:studentCookie,body:{topic:'Python'}});assert.equal(r.res.status,409,'no se permiten dos sesiones activas a la vez');r=await request('/api/study/sessions/stop',{method:'POST',cookie:adminCookie,body:{id:studyId}});assert.equal(r.res.status,404,'una cuenta no puede cerrar sesiones de otra');r=await request('/api/study/sessions/stop',{method:'POST',cookie:studentCookie,body:{id:studyId}});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.ok(Number.isInteger(r.data.session.durationSeconds));r=await request('/api/study/sessions',{cookie:studentCookie});assert.equal(r.res.status,200);assert.equal(r.data.sessions[0].topic,'Java');assert.equal(r.data.sessions[0].note,'Colecciones');assert.equal(r.data.totals.completed,1);r=await request('/api/reviews',{cookie:studentCookie});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.ok(Array.isArray(r.data.reviews),'el calendario de repetición espaciada debe devolver una lista');assert.ok(r.data.reviews.length>0,'cada test corregido debe programar al menos un tema para repaso');assert.ok(r.data.reviews.every(x=>typeof x.topic==='string'&&Number.isInteger(x.intervalDays)&&x.intervalDays>=1&&Number.isFinite(Date.parse(x.dueAt))),'cada repaso debe tener tema, intervalo y fecha válida');assert.equal(typeof r.data.due,'number');
  r=await request('/api/logout',{method:'POST',cookie:studentCookie,body:{}});assert.equal(r.res.status,200);studentCookie=r.cookie;
  r=await request('/api/me',{cookie:studentCookie});assert.equal(r.data.user,null);
  r=await request('/api/login',{method:'POST',body:{email:'alumno@codigoclaro.test',password:'UnaClaveDePrueba_2026!'}});assert.equal(r.res.status,200,JSON.stringify(r.data));studentCookie=r.cookie;
  r=await request('/api/progress',{cookie:studentCookie});assert.equal(r.res.status,200);assert.equal(r.data.progress.xp>=25,true);
  r=await request('/api/progress',{method:'PUT',cookie:studentCookie,body:{xp:30,completed:['Java_Tema_01'],attempts:[{id:'test2',pct:75}]}});assert.equal(r.res.status,200);assert.equal(r.data.progress.planner.length,1,'la sincronización del aula no debe borrar el plan de estudio');
  r=await request('/api/account/password',{method:'POST',cookie:studentCookie,body:{currentPassword:'UnaClaveDePrueba_2026!',newPassword:'OtraClaveDePrueba_2026!'}});assert.equal(r.res.status,200,JSON.stringify(r.data));
  r=await request('/api/logout',{method:'POST',cookie:studentCookie,body:{}});studentCookie=r.cookie;
  r=await request('/api/login',{method:'POST',body:{email:'alumno@codigoclaro.test',password:'UnaClaveDePrueba_2026!'}});assert.equal(r.res.status,401);
  r=await request('/api/login',{method:'POST',body:{email:'alumno@codigoclaro.test',password:'OtraClaveDePrueba_2026!'}});assert.equal(r.res.status,200);studentCookie=r.cookie;
  r=await request('/api/feedback',{method:'POST',cookie:studentCookie,body:{kind:'idea',rating:5,message:'Añadir más ejercicios de SQL'}});assert.equal(r.res.status,201,JSON.stringify(r.data));
  r=await request('/api/feedback/mine',{cookie:studentCookie});assert.equal(r.res.status,200);assert.equal(r.data.items.length,1);
  r=await request('/api/admin/overview',{cookie:studentCookie});assert.equal(r.res.status,403);
  r=await request('/api/admin/overview',{cookie:adminCookie});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.equal(r.data.totals.users,2);assert.equal(r.data.totals.feedbackOpen,1);assert.ok(r.data.feedback.some(f=>f.message==='Añadir más ejercicios de SQL'));
  r=await request('/api/register',{method:'POST',body:{email:'formula@codigoclaro.test',password:'UnaClaveDePrueba_2026!',name:'=1+1',consent:true}});assert.equal(r.res.status,201,JSON.stringify(r.data));assert.equal(r.data.user.role,'student');
  r=await request('/api/admin/users.csv',{cookie:adminCookie});assert.equal(r.res.status,200);assert.match(r.res.headers.get('content-type'),/text\/csv/);assert.match(r.text,/alumno@codigoclaro\.test/);assert.match(r.text,/"\t=1\+1"/,'el CSV debe neutralizar nombres que se interpretarían como fórmulas');
  r=await request('/api/admin/feedback/1',{method:'PATCH',cookie:adminCookie,body:{status:'resolved'}});assert.equal(r.res.status,200);
  r=await request('/api/admin/overview',{cookie:adminCookie});assert.equal(r.data.totals.feedbackOpen,0);
  r=await request('/api/account',{method:'DELETE',cookie:studentCookie,body:{password:'OtraClaveDePrueba_2026!',confirm:'ELIMINAR'}});assert.equal(r.res.status,200,JSON.stringify(r.data));
  r=await request('/api/me',{cookie:studentCookie});assert.equal(r.data.user,null);
});
});

test('PostgreSQL conserva la dificultad declarada en cada pregunta', () => {
  const source=fs.readFileSync(path.resolve(__dirname,'../server-postgres.js'),'utf8');
  const match=source.match(/^function levelFor\(q\).*\}$/m);
  assert.ok(match,'server-postgres.js debe definir el mapeo de dificultad usado al sembrar preguntas');
  const levelFor=vm.runInNewContext(`(${match[0]})`);
  for(const question of require('../lib/quizzes')){
    assert.equal(levelFor(question),question.difficulty,`La pregunta ${question.id} debe conservar su dificultad explícita`);
  }
});
