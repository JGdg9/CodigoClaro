/** CódigoClaro — Servidor alternativo de CódigoClaro con PostgreSQL. Se activa explícitamente en staging y no sustituye al servidor principal hasta completar las pruebas de migración. */
'use strict';
// Backend PostgreSQL opt-in. The existing SQLite server.js remains unchanged.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { Pool } = require('pg');
const quizzes = require('./lib/quizzes');
const scrypt = promisify(crypto.scrypt);
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';
const PUBLIC = path.resolve(__dirname, 'public');
const SESSION_MS = 7 * 86400000;
const MAX_BODY = 180 * 1024;
// Las claves BIGSERIAL de PostgreSQL están limitadas a enteros con signo de 64 bits.
const pgInt64TooLarge=value=>{const normalized=value.replace(/^0+(?=\d)/,'');return normalized.length>19||(normalized.length===19&&normalized>'9223372036854775807');};

if (!process.env.DATABASE_URL) { console.error('PostgreSQL no iniciado: falta DATABASE_URL.'); process.exit(1); }
if (IS_PROD && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) { console.error('En producción configura SESSION_SECRET (mínimo 32 caracteres).'); process.exit(1); }
const COOKIE_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(48).toString('hex');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSLMODE === 'disable' ? false : { rejectUnauthorized: true }, max: Number(process.env.PGPOOL_MAX || 10), idleTimeoutMillis: 30000, connectionTimeoutMillis: 8000 });
/** Respuesta JSON común: evita caché y añade cabeceras básicas de seguridad. */
const json=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
const fail=(res,status,message)=>json(res,status,{error:message});
const emailOk=v=>typeof v==='string'&&v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const textOk=(v,max=120)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max;
const userPublic=u=>u?({id:String(u.id),email:u.email,name:u.display_name,role:u.role,created_at:u.created_at,last_login_at:u.last_login_at}):null;
/** Lee JSON con un límite real en bytes UTF-8 y errores HTTP previsibles. */
async function body(req){
  const chunks=[];let size=0;
  for await(const chunk of req){
    const bytes=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);
    size+=bytes.length;
    if(size>MAX_BODY){const e=new Error('La petición es demasiado grande.');e.status=413;throw e;}
    chunks.push(bytes);
  }
  if(!size)return {};
  const mediaType=(req.headers['content-type']||'').split(';',1)[0].trim().toLowerCase();
  if(mediaType!=='application/json'){const e=new Error('Se esperaba una solicitud JSON.');e.status=415;throw e;}
  let value;
  try{value=JSON.parse(Buffer.concat(chunks,size).toString('utf8'));}
  catch{const e=new Error('JSON no válido.');e.status=400;throw e;}
  if(!value||typeof value!=='object'||Array.isArray(value)){const e=new Error('El cuerpo JSON debe ser un objeto.');e.status=400;throw e;}
  return value;
}
/** Convierte el encabezado Cookie en un mapa; valores mal codificados se ignoran. */
function cookies(req){
  const values=(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(Boolean).map(x=>{
    const i=x.indexOf('='),key=i<0?x:x.slice(0,i),raw=i<0?'':x.slice(i+1);
    try{return [key,decodeURIComponent(raw)];}catch{return [key,''];}
  });
  return Object.fromEntries(values);
}
/** Firma un identificador de sesión con HMAC para impedir que el cliente lo altere. */
function signed(sid){return crypto.createHmac('sha256',COOKIE_SECRET).update(sid).digest('base64url');}
/** Construye la cookie de sesión con HttpOnly, SameSite, caducidad y Secure en producción. */
function cookieHeader(sid,maxAge=SESSION_MS/1000){return `cc.sid=${encodeURIComponent(sid+'.'+signed(sid))}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${IS_PROD?'; Secure':''}`;}
/** Verifica la firma de la cookie y recupera el usuario de una sesión no caducada. */
async function currentUser(req){const raw=cookies(req)['cc.sid'];if(!raw)return null;const parts=raw.split('.');if(parts.length!==2)return null;const [sid,sig]=parts;if(!sid||!sig)return null;const a=Buffer.from(sig),b=Buffer.from(signed(sid));if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;const {rows}=await pool.query('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.sid=$1 AND s.expires_at>NOW()', [sid]);return rows[0]||null;}
/** Exige una sesión válida y responde 401 cuando falta. */
async function requireUser(req,res){const u=await currentUser(req);if(!u)fail(res,401,'Inicia sesión para continuar.');return u;}
/** Serializa escrituras de progreso del mismo usuario con un bloqueo compartido. */
async function lockProgressUser(client,userId){const {rowCount}=await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);if(!rowCount){const e=new Error('Inicia sesión para continuar.');e.status=401;throw e;}}
/** Persiste una sesión de siete días y configura su cookie HttpOnly. */
async function startSession(res,userId){const sid=crypto.randomBytes(32).toString('base64url');await pool.query('INSERT INTO sessions(sid,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL \'7 days\')',[sid,userId]);res.setHeader('Set-Cookie',cookieHeader(sid));}
/** Sirve recursos públicos evitando traversal de rutas fuera de public/. */
function staticFile(req,res,pathname){let decoded;try{decoded=decodeURIComponent(pathname)}catch{return fail(res,400,'Ruta no válida.');}if(decoded.includes('\0')||decoded.includes('\\'))return fail(res,400,'Ruta no válida.');/* Compatibilidad con URL históricas mientras los recursos se sirven desde carpetas por tipo. */if(/^\/[^/]+\.pdf$/i.test(decoded)&&!fs.existsSync(path.join(PUBLIC,decoded.slice(1))))decoded='/temarios'+decoded;if(/^\/(?:LEEME(?:_IDE)?|README|EMPEZAR_AQUI|NOTAS_DE_VERSION|PRUEBAS_REALIZADAS)\.txt$/i.test(decoded)||/^\/GUIA_PRUEBAS_RAPIDAS\.md$/i.test(decoded)){const legacy=path.basename(decoded);if(fs.existsSync(path.join(PUBLIC,'ayuda',legacy)))decoded='/ayuda/'+legacy;}const target=path.resolve(PUBLIC,'.'+(decoded==='/'?'/index.html':decoded));if(target!==PUBLIC&&!target.startsWith(PUBLIC+path.sep))return fail(res,403,'Acceso denegado.');let stat;try{stat=fs.statSync(target)}catch{return fail(res,404,'No encontrado.');}if(!stat.isFile())return fail(res,404,'No encontrado.');const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.md':'text/markdown; charset=utf-8','.pdf':'application/pdf','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};res.writeHead(200,{'Content-Type':types[path.extname(target).toLowerCase()]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':path.extname(target)==='.html'?'no-cache':'public, max-age=3600'});if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(target);stream.on('error',()=>res.destroy());stream.pipe(res);}
/** Inserta preguntas iniciales sin duplicar identificadores existentes. */
async function seedQuestions(){
  await pool.query(`INSERT INTO courses(slug,title,description,technology,level) VALUES('programacion-general','Programación','Fundamentos y práctica de programación','General','beginner') ON CONFLICT(slug) DO NOTHING`);
  const {rows:[course]}=await pool.query("SELECT id FROM courses WHERE slug='programacion-general'");
  for(const q of quizzes){await pool.query(`INSERT INTO questions(id,course_id,topic,prompt,options,correct_index,explanation,difficulty,active) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8,true) ON CONFLICT(id) DO NOTHING`,[q.id,course.id,q.topic,q.q,JSON.stringify(q.o),q.a,q.e,levelFor(q)]);}
}
/** Valida y devuelve la dificultad declarada por la pregunta de origen. */
function levelFor(q){if(!['basic','intermediate','advanced'].includes(q.difficulty))throw new Error(`La pregunta ${q.id} debe declarar una dificultad válida.`);return q.difficulty;}
/** Despacha las rutas HTTP del backend PostgreSQL y controla sus errores. */
async function handler(req,res){
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`),route=url.pathname,method=req.method;
  if(route.startsWith('/api/')&&['POST','PUT','PATCH','DELETE'].includes(method)){const rawOrigin=req.headers.origin;if(!rawOrigin)return fail(res,403,'La petición debe incluir un origen válido.');try{const origin=new URL(rawOrigin).origin;const expected=`${IS_PROD?'https':'http'}://${req.headers.host}`;if(origin!==expected)return fail(res,403,'Origen no permitido.');}catch{return fail(res,403,'Origen no permitido.');}}
  if(method==='GET'&&route==='/api/health'){try{await pool.query('SELECT 1');return json(res,200,{ok:true,service:'codigoclaro',version:require('./package.json').version,database:'postgresql',features:['postgresql','users','courses','quiz-attempts','lesson-progress','study-tasks','study-statistics']});}catch{return fail(res,503,'Base de datos no disponible.');}}
  if(method==='GET'&&route==='/api/me'){const u=await currentUser(req);return json(res,200,{user:userPublic(u)});}
  if(method==='POST'&&route==='/api/register'){const b=await body(req),email=typeof b.email==='string'?b.email.trim().toLowerCase():'',rawName=b.name||b.displayName,name=typeof rawName==='string'?rawName.trim():'';if(!emailOk(email)||!textOk(name,80)||typeof b.password!=='string'||b.password.length<10||b.password.length>200||b.consent!==true)return fail(res,400,'Revisa email, nombre, contraseña (10 caracteres mínimo) y consentimiento.');const salt=crypto.randomBytes(16).toString('hex'),hash=await scrypt(b.password,salt,64),role='student';try{const {rows:[u]}=await pool.query('INSERT INTO users(email,display_name,password_hash,role,consent_at) VALUES($1,$2,$3,$4,NOW()) RETURNING *',[email,name,`scrypt$${salt}$${Buffer.from(hash).toString('hex')}`,role]);await startSession(res,u.id);return json(res,201,{user:userPublic(u)});}catch(e){if(e.code==='23505')return fail(res,409,'Ya existe una cuenta con ese email.');throw e;}}
  if(method==='POST'&&route==='/api/login'){const b=await body(req),email=String(b.email||'').trim().toLowerCase();const {rows:[u]}=await pool.query('SELECT * FROM users WHERE email=$1',[email]);let valid=false;if(u&&typeof b.password==='string'&&typeof u.password_hash==='string'){const p=u.password_hash.split('$');if(p.length===3&&p[0]==='scrypt'&&/^[a-f0-9]{32}$/i.test(p[1])&&/^[a-f0-9]{128}$/i.test(p[2])){const h=await scrypt(b.password,p[1],64),stored=Buffer.from(p[2],'hex'),actual=Buffer.from(h);/* timingSafeEqual requiere búferes de la misma longitud. */valid=stored.length===actual.length&&crypto.timingSafeEqual(stored,actual);}}if(!valid)return fail(res,401,'Email o contraseña incorrectos.');await pool.query('UPDATE users SET last_login_at=NOW() WHERE id=$1',[u.id]);await startSession(res,u.id);return json(res,200,{user:userPublic(u)});}
  if(method==='POST'&&route==='/api/logout'){const raw=cookies(req)['cc.sid'];if(raw){const sid=raw.split('.')[0];await pool.query('DELETE FROM sessions WHERE sid=$1',[sid]);}res.setHeader('Set-Cookie','cc.sid=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0'+(IS_PROD?'; Secure':''));return json(res,200,{ok:true});}
  if(method==='GET'&&route==='/api/courses'){const {rows}=await pool.query('SELECT c.id,c.slug,c.title,c.description,c.technology,c.level,COUNT(l.id)::int AS lesson_count FROM courses c LEFT JOIN course_lessons l ON l.course_id=c.id WHERE c.published=true GROUP BY c.id ORDER BY c.technology,c.title');return json(res,200,{courses:rows});}
  const courseSlugMatch=route.match(/^\/api\/courses\/([a-z0-9-]+)$/i);
  if(courseSlugMatch&&method==='GET'){const {rows:[course]}=await pool.query('SELECT id,slug,title,description,technology,level FROM courses WHERE slug=$1 AND published=true',[courseSlugMatch[1].toLowerCase()]);if(!course)return fail(res,404,'Curso no encontrado.');const lessons=await pool.query('SELECT id,slug,title,content,position FROM course_lessons WHERE course_id=$1 ORDER BY position,id',[course.id]);return json(res,200,{course,lessons:lessons.rows});}
  if(route==='/api/admin/courses'&&method==='POST'){const admin=await requireUser(req,res);if(!admin)return;if(admin.role!=='admin')return fail(res,403,'Se requiere una cuenta de administración.');const b=await body(req),slug=typeof b.slug==='string'?b.slug.trim().toLowerCase():'',title=typeof b.title==='string'?b.title.trim():'',technology=b.technology===undefined?'General':typeof b.technology==='string'?b.technology.trim():'';if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||!textOk(title,160)||!textOk(technology,80)||(b.level!==undefined&&!['beginner','intermediate','advanced'].includes(b.level))||(b.published!==undefined&&typeof b.published!=='boolean')||(b.description!==undefined&&(typeof b.description!=='string'||b.description.length>2000)))return fail(res,400,'Datos del curso no válidos.');try{const {rows:[course]}=await pool.query('INSERT INTO courses(slug,title,description,technology,level,published) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[slug,title,b.description||'',technology,b.level||'beginner',b.published!==false]);return json(res,201,{course});}catch(e){if(e.code==='23505')return fail(res,409,'Ya existe un curso con ese slug.');throw e;}}
  const adminCourseMatch=route.match(/^\/api\/admin\/courses\/(\d+)$/);
  if(adminCourseMatch&&pgInt64TooLarge(adminCourseMatch[1]))return fail(res,400,'Identificador de curso no válido.');
  if(adminCourseMatch&&method==='PATCH'){const admin=await requireUser(req,res);if(!admin)return;if(admin.role!=='admin')return fail(res,403,'Se requiere una cuenta de administración.');const b=await body(req);if(b.title!==undefined&&!textOk(b.title,160))return fail(res,400,'Título no válido.');if(b.level!==undefined&&!['beginner','intermediate','advanced'].includes(b.level))return fail(res,400,'Nivel no válido.');if(b.technology!==undefined&&!textOk(b.technology,80))return fail(res,400,'Tecnología no válida.');if(b.description!==undefined&&(typeof b.description!=='string'||b.description.length>2000))return fail(res,400,'Descripción no válida.');if(b.published!==undefined&&typeof b.published!=='boolean')return fail(res,400,'El estado publicado debe ser booleano.');const {rows:[course]}=await pool.query('UPDATE courses SET title=COALESCE($1,title),description=COALESCE($2,description),technology=COALESCE($3,technology),level=COALESCE($4,level),published=COALESCE($5,published),updated_at=NOW() WHERE id=$6 RETURNING *',[b.title===undefined?null:b.title.trim(),b.description??null,b.technology===undefined?null:b.technology.trim(),b.level??null,b.published??null,adminCourseMatch[1]]);if(!course)return fail(res,404,'Curso no encontrado.');return json(res,200,{course});}
  const adminLessonsMatch=route.match(/^\/api\/admin\/courses\/(\d+)\/lessons$/);
  if(adminLessonsMatch&&pgInt64TooLarge(adminLessonsMatch[1]))return fail(res,400,'Identificador de curso no válido.');
  if(adminLessonsMatch&&method==='POST'){const admin=await requireUser(req,res);if(!admin)return;if(admin.role!=='admin')return fail(res,403,'Se requiere una cuenta de administración.');const b=await body(req);if(typeof b.slug!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b.slug)||!textOk(b.title,180)||!Number.isInteger(b.position)||b.position<0||b.position>2147483647)return fail(res,400,'Datos de lección no válidos.');try{const {rows:[lesson]}=await pool.query('INSERT INTO course_lessons(course_id,slug,title,content,position) VALUES($1,$2,$3,$4,$5) RETURNING *',[adminLessonsMatch[1],b.slug,b.title.trim(),String(b.content||'').slice(0,20000),b.position]);return json(res,201,{lesson});}catch(e){if(e.code==='23503')return fail(res,404,'Curso no encontrado.');if(e.code==='23505')return fail(res,409,'Slug o posición de lección duplicados.');throw e;}}
  if(method==='GET'&&route==='/api/learning/topics'){const {rows}=await pool.query('SELECT topic AS name,COUNT(*)::int AS "questionCount",LOWER(REGEXP_REPLACE(topic,\'[^a-zA-Z0-9]+\',\'-\',\'g\')) AS slug FROM questions WHERE active=true GROUP BY topic ORDER BY topic');return json(res,200,{topics:rows,totalQuestions:rows.reduce((n,r)=>n+r.questionCount,0)});}
  if(method==='GET'&&route==='/api/quiz'){const topic=url.searchParams.get('topic')||'all',count=Math.min(30,Math.max(1,Math.floor(Number(url.searchParams.get('count'))||10)));const args=[],where=['active=true'];if(topic!=='all'){args.push(topic);where.push(`topic=$${args.length}`);}args.push(count);const {rows}=await pool.query(`SELECT id,topic,prompt AS q,options,difficulty FROM questions WHERE ${where.join(' AND ')} ORDER BY RANDOM() LIMIT $${args.length}`,args);return json(res,200,{questions:rows.map(q=>({...q,options:typeof q.options==='string'?JSON.parse(q.options):q.options})),available:rows.length,requestedCount:count});}
  if(method==='POST'&&route==='/api/quiz/submit'){
    const u=await requireUser(req,res);if(!u)return;
    const b=await body(req),answers=b.answers;
    // -1 representa una pregunta sin respuesta; las demás respuestas deben apuntar a una opción existente.
    if(!Array.isArray(answers)||answers.length<1||answers.length>30||!answers.every(a=>a&&typeof a.id==='string'&&Number.isInteger(a.answer)&&a.answer>=-1&&a.answer<=10)||new Set(answers.map(a=>a.id)).size!==answers.length)return fail(res,400,'Respuestas no válidas o duplicadas.');
    const ids=answers.map(a=>a.id),{rows}=await pool.query('SELECT id,topic,prompt,options,correct_index,explanation FROM questions WHERE id=ANY($1::text[]) AND active=true',[ids]);
    if(rows.length!==answers.length)return fail(res,400,'El test contiene preguntas desconocidas.');
    const map=new Map(rows.map(q=>[q.id,q]));
    if(answers.some(a=>a.answer!==-1&&a.answer>=map.get(a.id).options.length))return fail(res,400,'La respuesta seleccionada no existe.');
    const detail=answers.map(a=>{const q=map.get(a.id);return{id:q.id,topic:q.topic,correct:a.answer>=0&&a.answer===q.correct_index,correctAnswer:q.correct_index,explanation:q.explanation,question:q.prompt,chosen:a.answer}});
    const score=detail.filter(a=>a.correct).length,pct=Math.round(score/detail.length*100),id=crypto.randomUUID(),topic=String(b.topic||'all').slice(0,100),mode=b.mode==='exam'?'exam':'practice';
    const correctIds=detail.filter(answer=>answer.correct).map(answer=>answer.id),client=await pool.connect();let xpAwarded=0;
    try{
      await client.query('BEGIN');
      // El registro único evita acreditar dos veces una pregunta aunque se repita o se envíe a la vez.
      const credited=correctIds.length?await client.query('INSERT INTO quiz_question_rewards(user_id,question_id) SELECT $1,ids.question_id FROM UNNEST($2::text[]) AS ids(question_id) WHERE true ON CONFLICT(user_id,question_id) DO NOTHING RETURNING question_id',[u.id,correctIds]):{rows:[]};
      const newlyMastered=credited.rows.map(row=>row.question_id);
      // La bonificación perfecta exige al menos dos respuestas nuevas, todas correctas en este intento.
      xpAwarded=newlyMastered.length*10+(pct===100&&detail.length>=2&&newlyMastered.length===detail.length?20:0);
      await client.query('INSERT INTO quiz_attempts(id,user_id,topic,mode,score,total,pct,xp_awarded,answers) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)',[id,u.id,topic,mode,score,detail.length,pct,xpAwarded,JSON.stringify(detail)]);
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
    finally{client.release()}
    return json(res,201,{id,score,total:detail.length,pct,xpAwarded,answers:detail});
  }
  if(method==='GET'&&route==='/api/progress'){const u=await requireUser(req,res);if(!u)return;const [attempts,lessons,tasks]=await Promise.all([pool.query('SELECT id,topic,mode,score,total,pct,xp_awarded AS "xpAwarded",created_at AS "createdAt" FROM quiz_attempts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[u.id]),pool.query('SELECT lesson_key,completed_at,last_position,updated_at FROM lesson_progress WHERE user_id=$1 ORDER BY updated_at DESC',[u.id]),pool.query('SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE completed_at IS NOT NULL)::int AS completed FROM study_tasks WHERE user_id=$1',[u.id])]);return json(res,200,{progress:{attempts:attempts.rows,completed:lessons.rows.filter(x=>x.completed_at).map(x=>x.lesson_key),tasks:tasks.rows[0],updatedAt:new Date().toISOString()}});}
  if(method==='PUT'&&route==='/api/progress'){
    const u=await requireUser(req,res);if(!u)return;
    const b=await body(req),completed=b.completed;
    if(!Array.isArray(completed)||completed.length>2000||!completed.every(x=>typeof x==='string'&&x.length<=180))return fail(res,400,'Lista de progreso no válida.');
    const keys=[...new Set(completed)],client=await pool.connect();
    try{
      await client.query('BEGIN');
      await lockProgressUser(client,u.id);
      // El snapshot reemplaza marcas (vacío las desmarca); mantiene posiciones y el registro de XP validado.
      await client.query('UPDATE lesson_progress SET completed_at=NULL,updated_at=NOW() WHERE user_id=$1 AND completed_at IS NOT NULL AND NOT (lesson_key=ANY($2::text[]))',[u.id,keys]);
      if(keys.length)await client.query(`INSERT INTO lesson_progress(user_id,lesson_key,completed_at,updated_at)
        SELECT $1,incoming.lesson_key,NOW(),NOW() FROM UNNEST($2::text[]) AS incoming(lesson_key)
        ON CONFLICT(user_id,lesson_key) DO UPDATE SET completed_at=NOW(),updated_at=NOW()`,[u.id,keys]);
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
    finally{client.release()}
    return json(res,200,{ok:true,progress:{completed:keys}});
  }
  if(method==='PUT'&&route==='/api/progress/lesson'){
    const u=await requireUser(req,res);if(!u)return;
    const b=await body(req);
    if(!textOk(b.lessonKey,180)||!Number.isInteger(b.lastPosition??0)||(b.lastPosition??0)<0||(b.lastPosition??0)>2147483647||(b.completed!==undefined&&typeof b.completed!=='boolean'))return fail(res,400,'Datos de progreso no válidos.');
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await lockProgressUser(client,u.id);
      await client.query(`INSERT INTO lesson_progress(user_id,lesson_key,completed_at,last_position,updated_at)
        VALUES($1,$2,CASE WHEN $3 THEN NOW() ELSE NULL END,$4,NOW())
        ON CONFLICT(user_id,lesson_key) DO UPDATE SET completed_at=CASE WHEN $3 THEN NOW() ELSE lesson_progress.completed_at END,last_position=$4,updated_at=NOW()`,[u.id,b.lessonKey,b.completed===true,b.lastPosition||0]);
      await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
    finally{client.release()}
    return json(res,200,{ok:true});
  }
  if(route==='/api/tasks'&&method==='GET'){const u=await requireUser(req,res);if(!u)return;const {rows}=await pool.query('SELECT id,title,notes,due_at AS "dueAt",completed_at AS "completedAt",created_at AS "createdAt" FROM study_tasks WHERE user_id=$1 ORDER BY completed_at NULLS FIRST,created_at DESC',[u.id]);return json(res,200,{tasks:rows});}
  if(route==='/api/tasks'&&method==='POST'){const u=await requireUser(req,res);if(!u)return;const b=await body(req),dueAt=b.dueAt===undefined||b.dueAt===null||b.dueAt===''?null:b.dueAt;if(!textOk(b.title,180)||typeof (b.notes??'')!=='string'||String(b.notes??'').length>2000)return fail(res,400,'Título o notas no válidos.');if(dueAt!==null&&(typeof dueAt!=='string'||!Number.isFinite(Date.parse(dueAt))))return fail(res,400,'Fecha de vencimiento no válida.');const id=crypto.randomUUID(),{rows:[task]}=await pool.query('INSERT INTO study_tasks(id,user_id,title,notes,due_at) VALUES($1,$2,$3,$4,$5) RETURNING id,title,notes,due_at AS "dueAt",completed_at AS "completedAt",created_at AS "createdAt"',[id,u.id,b.title.trim(),b.notes||'',dueAt]);return json(res,201,{task});}
  const taskMatch=route.match(/^\/api\/tasks\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);if(taskMatch&&method==='PATCH'){const u=await requireUser(req,res);if(!u)return;const b=await body(req);if(typeof b.completed!=='boolean')return fail(res,400,'Indica completed como booleano.');const {rows:[task]}=await pool.query('UPDATE study_tasks SET completed_at=CASE WHEN $1 THEN NOW() ELSE NULL END,updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING id,title,notes,due_at AS "dueAt",completed_at AS "completedAt"',[b.completed,taskMatch[1],u.id]);if(!task)return fail(res,404,'Tarea no encontrada.');return json(res,200,{task});}
  if(taskMatch&&method==='DELETE'){const u=await requireUser(req,res);if(!u)return;const {rowCount}=await pool.query('DELETE FROM study_tasks WHERE id=$1 AND user_id=$2',[taskMatch[1],u.id]);return rowCount?json(res,200,{ok:true}):fail(res,404,'Tarea no encontrada.');}
  if(method==='GET'&&route==='/api/study/sessions'){const u=await requireUser(req,res);if(!u)return;const {rows}=await pool.query('SELECT id,topic,started_at AS "startedAt",ended_at AS "endedAt",duration_seconds AS "durationSeconds",note FROM study_sessions WHERE user_id=$1 ORDER BY started_at DESC LIMIT 100',[u.id]);return json(res,200,{sessions:rows});}
  if(method==='POST'&&route==='/api/study/sessions/start'){const u=await requireUser(req,res);if(!u)return;const b=await body(req),topic=String(b.topic||'').slice(0,120),id=crypto.randomUUID();const {rows:[session]}=await pool.query('INSERT INTO study_sessions(id,user_id,topic,started_at) VALUES($1,$2,$3,NOW()) RETURNING id,topic,started_at AS "startedAt"',[id,u.id,topic]);return json(res,201,{session});}
  if(method==='POST'&&route==='/api/study/sessions/stop'){const u=await requireUser(req,res);if(!u)return;const b=await body(req);if(typeof b.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(b.id))return fail(res,400,'Identificador de sesión no válido.');const {rows:[session]}=await pool.query('UPDATE study_sessions SET ended_at=NOW(),duration_seconds=LEAST(86400,GREATEST(0,FLOOR(EXTRACT(EPOCH FROM (NOW()-started_at))))) WHERE id=$1 AND user_id=$2 AND ended_at IS NULL RETURNING id,topic,started_at AS "startedAt",ended_at AS "endedAt",duration_seconds AS "durationSeconds"',[b.id,u.id]);if(!session)return fail(res,404,'Sesión activa no encontrada.');return json(res,200,{session});}
  if(method==='GET'&&route==='/api/stats/overview'){const u=await requireUser(req,res);if(!u)return;const [q,s,t,l]=await Promise.all([pool.query('SELECT COUNT(*)::int AS tests,COALESCE(AVG(pct),0)::int AS "averagePct",COALESCE(SUM(xp_awarded),0)::int AS xp FROM quiz_attempts WHERE user_id=$1',[u.id]),pool.query('SELECT COALESCE(SUM(duration_seconds),0)::int AS "studySeconds",COUNT(*)::int AS sessions FROM study_sessions WHERE user_id=$1',[u.id]),pool.query('SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE completed_at IS NOT NULL)::int AS completed FROM study_tasks WHERE user_id=$1',[u.id]),pool.query('SELECT COUNT(*) FILTER(WHERE completed_at IS NOT NULL)::int AS completed FROM lesson_progress WHERE user_id=$1',[u.id])]);return json(res,200,{tests:q.rows[0],study:s.rows[0],tasks:t.rows[0],lessons:l.rows[0]});}
  if(route.startsWith('/api/'))return fail(res,404,'Ruta API no disponible en el backend PostgreSQL de esta versión.');
  if(!['GET','HEAD'].includes(method))return fail(res,405,'Método no permitido.');staticFile(req,res,route);
}
const server=http.createServer((req,res)=>{handler(req,res).catch(err=>{console.error('Request error:',err.message);if(!res.headersSent)fail(res,err.status||500,err.status?err.message:'Error interno del servidor.');else res.destroy();});});
(async()=>{try{await pool.query('SELECT 1');await seedQuestions();server.listen(PORT,'0.0.0.0',()=>console.log(`CódigoClaro PostgreSQL escuchando en ${PORT}`));}catch(e){console.error('No se pudo iniciar el backend PostgreSQL:',e.message);process.exit(1);}})();
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>server.close(async()=>{await pool.end();process.exit(0)}));
