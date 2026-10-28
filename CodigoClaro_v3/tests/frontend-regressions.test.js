/** CódigoClaro — Protege comportamientos de interfaz y errores corregidos en versiones anteriores. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const aula = fs.readFileSync(path.join(root, 'public/aula.html'), 'utf8');

function panelApiRunner(fetch) {
  const start = panel.indexOf('async function api(');
  const end = panel.indexOf('// flash:', start);
  if (start < 0 || end <= start) throw new Error('No se encontró el helper de API de la portada.');
  return vm.runInNewContext(`${panel.slice(start, end)}\napi;`, { fetch });
}

function panelApiResponse(status, error) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'application/json' },
    json: async () => ({ error })
  };
}

test('panel declara activeReviewTopics antes de usarlo', () => {
  assert.match(panel, /activeQuiz=null,activeReviewTopics=\[\],lastWrongQuiz=\[\]/);
  assert.match(panel, /activeReviewTopics\.length/);
});

test('corrector Java reconoce suma con + y en ambos órdenes', () => {
  assert.match(aula, /a\\s\*\\\+\\s\*b\|b\\s\*\\\+\\s\*a/);
  const addition = /a\s*\+\s*b|b\s*\+\s*a/;
  assert.equal(addition.test('static int sumar(int a, int b) { return a + b; }'), true);
  assert.equal(addition.test('static int sumar(int a, int b) { return b+a; }'), true);
});

test('ejercicios renderizan saltos de línea reales y el feedback no imprime \\n literal', () => {
  assert.match(aula, /e\[3\]\.replace\(\/\\\\\\\\n\/g,'\\n'\)/);
  assert.match(aula, /join\('\\n'\)/);
});

test('los errores de red del API no exponen rutas locales ni detalles internos', () => {
  const panelStart = panel.indexOf('async function api(');
  const panelEnd = panel.indexOf('// flash:', panelStart);
  assert.ok(panelStart >= 0 && panelEnd > panelStart);
  const panelApi = panel.slice(panelStart, panelEnd);
  assert.match(panelApi, /No hemos podido conectar con CódigoClaro/);
  assert.doesNotMatch(panelApi, /localhost:3000|\$\{url\}|e\.message/);

  const aulaStart = aula.indexOf('async function ccApi(');
  const aulaEnd = aula.indexOf('// ccStatus:', aulaStart);
  assert.ok(aulaStart >= 0 && aulaEnd > aulaStart);
  const aulaApi = aula.slice(aulaStart, aulaEnd);
  assert.match(aulaApi, /No se pudo conectar con CódigoClaro/);
  assert.doesNotMatch(aulaApi, /localhost:3000|\+url|e\.message/);
});

test('api del panel conserva validaciones seguras y oculta errores internos', async () => {
  const safeApi = panelApiRunner(async () => panelApiResponse(400, 'Credenciales incorrectas.'));
  await assert.rejects(safeApi('/api/login'), error => error.message === 'Credenciales incorrectas.');

  const unsafeApi = panelApiRunner(async () => panelApiResponse(400, 'Fallo en http://localhost:3000/api/login: TypeError'));
  await assert.rejects(unsafeApi('/api/login'), error => {
    assert.equal(error.message, 'No se pudo completar la solicitud. Inténtalo de nuevo.');
    assert.doesNotMatch(error.message, /localhost|3000|\/api\/login|TypeError/);
    return true;
  });

  const serverApi = panelApiRunner(async () => panelApiResponse(500, 'Error interno del servidor'));
  await assert.rejects(serverApi('/api/login'), error => {
    assert.equal(error.message, 'CódigoClaro no ha podido completar esta solicitud. Inténtalo de nuevo más tarde.');
    assert.doesNotMatch(error.message, /interno/);
    return true;
  });
});

test('la política de privacidad describe el borrador local y la transferencia de Java', () => {
  const privacy = fs.readFileSync(path.join(root, 'public/privacidad.html'), 'utf8');
  assert.match(privacy, /borrador local del IDE/);
  assert.match(privacy, /solo después de marcar el consentimiento[\s\S]*código fuente y el contenido de stdin/);
  assert.match(privacy, /Comprobar conexión[\s\S]*token opcional[\s\S]*no incluye tu código/);
  assert.match(privacy, /token, también se envía en la petición de ejecución/);
  assert.doesNotMatch(privacy, /el IDE no envía el código a un compilador remoto/);
});

test('la portada anuncia errores de autenticación y respeta áreas táctiles y movimiento reducido', () => {
  assert.match(panel, /id="authError"[^>]*role="alert"/);
  assert.match(panel, /\.nav-more > summary \{[^}]*min-height: 44px/);
  assert.match(panel, /\.nav-more-menu button\.nav-item \{[^}]*min-height: 44px/);
  assert.match(panel, /\.nav-more > summary::after \{ transition: none !important; transform: none !important; \}/);
  assert.match(panel, /main\.firstElementChild\.focus\(\{preventScroll:true\}\)/);
});

test('las limitaciones del piloto se explican en el registro y no cargan la portada', () => {
  assert.match(panel, /<aside id="pilotNote" class="section pilot-note hidden" role="note"/);
  assert.match(panel, /function showAuth\(mode='login'\)\{[^}]*insertBefore\(pilotNote,\$\('authSection'\)\.firstElementChild\)/);
  assert.match(panel, /function authMode\(mode\)\{[^}]*pilotNote[^}]*toggle\('hidden',!reg\)/);
  assert.match(panel, /setAttribute\('aria-describedby',reg\?'pilotDescription':'authSub'\)/);
  assert.match(panel, /Esta versión no verifica el correo ni permite restablecer la contraseña/);
  assert.match(panel, /id="registrationClosed" class="notice hidden" role="status"/);
  assert.match(panel, /registrationEnabled=health\.registrationEnabled===true/);
  assert.match(panel, /authSubmit'\)\.disabled=reg&&!registrationEnabled/);
  assert.match(panel, /const me=await api\('\/api\/me'\)/);
  assert.match(panel, /api\('\/api\/health'\)\.then\(health=>/);
  assert.doesNotMatch(panel, /Promise\.all\(\[api\('\/api\/me'\),api\('\/api\/catalog'\),api\('\/api\/health'\)\]\)/);
  assert.doesNotMatch(panel, /Si la olvidas, aún no podrás recuperarla desde la aplicación/);
});

test('la navegación editorial usa texto con contraste suficiente', () => {
  const navRules = [...panel.matchAll(/\.nav button\{([^}]*)\}/g)].map(match => match[1]);
  assert.ok(navRules.some(rule => rule.includes('color:#585858')), 'el texto de navegación debe usar el tono legible del tema');
  assert.doesNotMatch(panel, /\.nav button\{[^}]*color:#888888/);
});

test('el XP del panel solo procede de tests del servidor y el aula explica su sincronización local', () => {
  const saveStart = panel.indexOf('async function saveProgress()');
  const saveEnd = panel.indexOf('// stats:', saveStart);
  assert.ok(saveStart >= 0 && saveEnd > saveStart, 'se debe encontrar la sincronización del progreso');
  const save = panel.slice(saveStart, saveEnd);
  assert.doesNotMatch(save, /xp:|attempts:/, 'el panel no debe enviar XP ni intentos del cliente');
  const lessonStart = panel.indexOf('async function completeLesson(');
  const lessonEnd = panel.indexOf('// quizView:', lessonStart);
  const lesson = panel.slice(lessonStart, lessonEnd);
  assert.ok(lessonStart >= 0 && lessonEnd > lessonStart);
  assert.doesNotMatch(lesson, /progress\.xp|\+5 XP/, 'marcar una lección no debe prometer XP que el servidor no concede');
  assert.match(aula, /id="ccAccountStatus" role="status" aria-live="polite"/);
  assert.match(aula, /if\(!sync\.ok\)ccStatus\('Sesión iniciada, pero no se sincronizaron/);
  assert.match(aula, /if\(message\)ccStatus\(message\)/, 'el inicio de sesión no debe ocultar errores de sincronización');
});

test('aula usa tema claro también en el IDE', () => {
  assert.match(aula, /color-scheme:light/);
  assert.match(aula, /--bg:#f5f7fb/);
  assert.match(aula, /\.editor\{background:#fff!important;color:#172033!important/);
});

test('el IDE no descarga CodeMirror automáticamente y mantiene editor local', () => {
  assert.match(aula, /Editor local · funciona sin Internet/);
  assert.doesNotMatch(aula, /async function ideEnsureEditor\(\)\{[^}]*ccLoadCss\(/);
});

test('el IDE dirige cada lenguaje al motor que realmente ofrece', () => {
  const runStart = aula.indexOf('function ideRun(){');
  const runEnd = aula.indexOf('function ideRunJS(){', runStart);
  const run = runStart >= 0 && runEnd > runStart ? aula.slice(runStart, runEnd) : '';
  assert.match(run, /l\.id==='python'\)return ideRunPython\(\)/);
  assert.match(run, /l\.id==='react'\)return ideRunReact\(\)/);
  assert.match(run, /l\.id\.startsWith\('sql-'\).*ideRunSQL\(\)/);
  assert.match(run, /l\.id==='js'\)return ideRunJS\(\)/);
  assert.match(run, /l\.id==='java'\)return ideRunJudge0\(\)/);
  assert.match(aula, /id="ideJavaRemoteConsent" type="checkbox"/);
  assert.match(aula, /consent\.dataset\.endpoint!==base/);
  assert.doesNotMatch(run, /La compilación real necesita un JDK\/runtime local/);
});

test('tests incluyen tipo test, verdadero/falso, mixto y retos de código con rúbrica', () => {
  assert.match(aula, /id="qmode"/);
  assert.match(aula, /value="choice"/);
  assert.match(aula, /value="tf"/);
  assert.match(aula, /value="mixed"/);
  assert.match(aula, /value="code"/);
  assert.match(aula, /function gradeCodeQ\(/);
  assert.match(aula, /function showCodeQSolution\(/);
  assert.match(aula, /function restoreCodeQTemplate\(/);
  assert.match(aula, /no se mezclarán tecnologías/);
});

test('el IDE permite cargar retos guiados de los ejercicios en el editor', () => {
  assert.match(aula, /id="ideChallengeSelect"/);
  assert.match(aula, /onclick="ideLoadChallenge\(\)"/);
  assert.match(aula, /function ideLoadChallenge\(\)/);
});

test('tests respetan 25 preguntas, corrigen al seleccionar y muestran nota final', () => {
  assert.match(panel, /filterFallback:data\.filterFallback/);
  assert.match(panel, /checkQuizAnswer\(i,Number\(input\.value\)\)/);
  assert.match(panel, /Finalizar test y ver nota/);
  assert.match(panel, /Nota sobre 10/);
  assert.match(panel, /Correctas:/);
  assert.match(panel, /Incorrectas:/);
});

test('panel administrativo incluye gestión visual de temas y preguntas conectada a la API', () => {
  assert.match(panel, /async function adminContentView\(\)/);
  assert.match(panel, /api\('\/api\/admin\/learning\/topics'\)/);
  assert.match(panel, /api\('\/api\/admin\/learning\/questions\?'/);
  assert.match(panel, /async function saveAdminQuestion\(e\)/);
  assert.match(panel, /async function toggleAdminQuestion\(encodedId,active\)/);
  assert.match(panel, /Crear tema/);
  assert.match(panel, /Crear pregunta/);
});

test('panel administrativo incluye importación validada y exportación JSON del banco', () => { const html=fs.readFileSync(path.join(__dirname,'../public/index.html'),'utf8'); assert.match(html,/questionBankFile/); assert.match(html,/importQuestionBank/); assert.match(html,/exportQuestionBank/); assert.match(html,/questions\.import/); assert.match(html,/questions\.export\.json/); });

test('aula incluye panel visual de estadísticas conectado al backend', () => {
  assert.match(aula, /\['stats','Estadísticas'\]/);
  assert.match(aula, /function statsPage\(\)/);
  assert.match(aula, /fetch\('\/api\/stats\/topics'/);
  assert.match(aula, /fetch\('\/api\/attempts\?limit=8'/);
  assert.match(aula, /loadLearningStats\(\)/);
  assert.match(aula, /Precisión por tema/);
});

test('temporizador de estudio se conecta a sesiones persistentes del backend', () => {
  assert.match(aula, /id=\"ccStudyStart\"/);
  assert.match(aula, /id=\"ccStudyStop\"/);
  assert.match(aula, /\/api\/study\/sessions\/start/);
  assert.match(aula, /\/api\/study\/sessions\/stop/);
  assert.match(aula, /renderStudySessions\(studyData\)/);
});

test('cada filtro individual de tests tiene al menos cinco preguntas y el aleatorizador no usa sort aleatorio', () => {
  const match = aula.match(/const Q=(\[.*?\]);\s*Q\.push\(\.\.\.\(window\.CC_LOCAL_QUIZ_EXPANSION\s*\|\|\s*\[\]\)\);\s*const ccMemoryStorage/s);
  assert.ok(match, 'se debe poder localizar el banco de preguntas del aula');
  const questions = Function('return (' + match[1] + ')')();
  for (const technology of ['java','python','js','html','css','xml','sql','plsql','mongo','react','node','hibernate','kotlin','git','api','security','database']) {
    const count = questions.filter(q => q[0] === technology).length;
    assert.ok(count >= 5, `${technology} necesita al menos cinco preguntas; tiene ${count}`);
  }
  assert.match(aula, /for\(let i=pool\.length-1;i>0;i--\)/);
  for (const value of ['kotlin','git','api','security','database']) assert.match(aula, new RegExp('option value=\\\"' + value + '\\\"'));
  assert.doesNotMatch(aula, /\.sort\(\(\)=>Math\.random\(\)-\.5\)/);
});

test('la transformación verdadero/falso conserva la respuesta correcta y la incorrecta', () => {
  const match = aula.match(/function makeQuizItem\(q,mode,random=Math\.random\)\{.*?\n(?=function gradeQ\()/s);
  assert.ok(match, 'el constructor de preguntas debe poder probarse aisladamente');
  const makeQuizItem = Function(`${match[0]}; return makeQuizItem;`)();
  const q = ['python', '¿Qué devuelve range(2)?', ['[1,2]', '[0,1]', '[0,1,2]'], 1, 'range no incluye el límite superior.'];
  const trueStatement = makeQuizItem(q, 'tf', () => 0.4);
  assert.equal(trueStatement.correct, true);
  assert.equal(trueStatement.statement, '[0,1]');
  const falseStatement = makeQuizItem(q, 'tf', () => 0.1);
  assert.equal(falseStatement.correct, false);
  assert.equal(falseStatement.statement, '[1,2]');
  assert.equal(makeQuizItem(q, 'choice').kind, 'choice');
});

function quizNavigationGuardRunner({confirmResult=false,submitted=false,submitting=false}={}){
  const form={dataset:{...(submitted?{submitted:'true'}:{}),...(submitting?{submitting:'true'}:{})},answers:['2']};
  const cleared=[];
  const context={
    currentPage:'quiz',
    activeQuiz:[{id:'q1'}],
    activeReviewTopics:['java'],
    quizTimer:17,
    quizSeconds:41,
    quizStartedAt:123,
    clearInterval:id=>cleared.push(id),
    confirm:message=>{context.confirmMessage=message;context.confirmCalls=(context.confirmCalls||0)+1;return confirmResult},
    flash:(message,kind)=>{context.flashMessage=message;context.flashKind=kind},
    $:id=>id==='quizForm'?form:null
  };
  const start=panel.indexOf('function canNavigateFromQuiz(');
  const end=panel.indexOf('\nasync function render(',start);
  assert.ok(start>=0&&end>start,'se debe localizar la protección de navegación del test');
  const guard=vm.runInNewContext(panel.slice(start,end)+'\ncanNavigateFromQuiz;',context);
  return {context,form,cleared,guard};
}

test('cancelar la salida o reconfiguración conserva respuestas y temporizador',()=>{
  for(const [page,reconfigure] of [['courses',false],['quiz',true]]){
    const state=quizNavigationGuardRunner({confirmResult:false});
    const active=state.context.activeQuiz;
    assert.equal(state.guard(page,reconfigure),false);
    assert.equal(state.context.activeQuiz,active);
    assert.deepEqual(state.form.answers,['2']);
    assert.equal(state.context.quizTimer,17);
    assert.equal(state.context.quizSeconds,41);
    assert.deepEqual(state.cleared,[]);
    assert.match(state.context.confirmMessage,/perderás tus respuestas/);
    assert.match(state.context.confirmMessage,/detendrá el temporizador/);
  }
});

test('confirmar la salida descarta el test y detiene el temporizador',()=>{
  const state=quizNavigationGuardRunner({confirmResult:true});
  assert.equal(state.guard('courses'),true);
  assert.equal(state.context.activeQuiz,null);
  assert.deepEqual(state.context.activeReviewTopics,[]);
  assert.equal(state.context.quizTimer,null);
  assert.equal(state.context.quizSeconds,0);
  assert.equal(state.context.quizStartedAt,0);
  assert.deepEqual(state.cleared,[17]);
});

test('mientras se guarda, el test no se puede abandonar',()=>{
  const state=quizNavigationGuardRunner({submitting:true});
  assert.equal(state.guard('courses'),false);
  assert.equal(state.context.activeQuiz.length,1);
  assert.equal(state.context.quizTimer,17);
  assert.deepEqual(state.cleared,[]);
  assert.equal(state.context.confirmCalls||0,0);
  assert.equal(state.context.flashKind,'warn');
});

test('volver a pulsar Tests no reinicia el test ni consulta confirmación',()=>{
  const state=quizNavigationGuardRunner();
  const active=state.context.activeQuiz;
  assert.equal(state.guard('quiz'),false);
  assert.equal(state.context.activeQuiz,active);
  assert.equal(state.context.quizTimer,17);
  assert.equal(state.context.confirmCalls||0,0);
  assert.deepEqual(state.cleared,[]);
});

test('el resultado enviado queda estable al volver a pulsar Tests',()=>{
  const state=quizNavigationGuardRunner({submitted:true});
  assert.equal(state.guard('quiz'),false);
  assert.equal(state.context.confirmCalls||0,0);
  assert.equal(state.context.activeQuiz.length,1);
});

test('Más incluye Diagnóstico y ayuda junto a Aula e IDE',()=>{
  assert.match(panel,/<a class="nav-item" href="\/diagnostico\.html">Diagnóstico y ayuda<\/a>/);
  assert.match(panel,/<a class="nav-item" href="\/aula\.html">Aula e IDE<\/a>/);
  assert.match(panel,/onclick="render\('quiz',\{reconfigure:true\}\)">Volver a configurar/);
});
