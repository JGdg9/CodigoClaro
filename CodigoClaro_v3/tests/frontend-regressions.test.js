/** CódigoClaro — Protege comportamientos de interfaz y errores corregidos en versiones anteriores. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
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


function quizDiscardRunner(hasForm, confirmation, submitted = false, submissionPending = false) {
  const submitButton = { disabled: submitted };
  const form = hasForm ? { querySelector: selector => selector === 'button[type="submit"]' ? submitButton : null } : null;
  const elements = { quizForm: form };
  const cleared = [];
  const messages = [];
  let confirmationCalls = 0;
  const context = {
    currentPage: 'quiz',
    quizTimer: 42,
    quizSubmissionPending: submissionPending,
    $: id => elements[id] || null,
    window: { confirm: () => { confirmationCalls++; return confirmation; } },
    clearInterval: id => cleared.push(id),
    flash: (...args) => messages.push(args)
  };
  const start = panel.indexOf('function hasUnsubmittedQuizAttempt()');
  const end = panel.indexOf('// quizView:', start);
  assert.ok(start >= 0 && end > start, 'se debe encontrar la confirmación de salida del test');
  const guard = vm.runInNewContext(
    `${panel.slice(start, end)}\nconfirmDiscardQuizAttempt;`,
    context
  );
  return { guard, context, form, elements, cleared, messages, confirmationCalls: () => confirmationCalls };
}

test('cancelar la salida conserva el formulario y el temporizador del test', () => {
  const attempt = quizDiscardRunner(true, false);

  assert.equal(attempt.guard(), false);
  assert.equal(attempt.elements.quizForm, attempt.form);
  assert.equal(attempt.context.quizTimer, 42);
  assert.deepEqual(attempt.cleared, []);
  assert.equal(attempt.confirmationCalls(), 1);
});

test('confirmar la salida detiene el temporizador antes de descartar el test', () => {
  const attempt = quizDiscardRunner(true, true);

  assert.equal(attempt.guard(), true);
  assert.equal(attempt.context.quizTimer, null);
  assert.deepEqual(attempt.cleared, [42]);
  assert.equal(attempt.confirmationCalls(), 1);
});

test('un test ya enviado no vuelve a pedir confirmación para salir', () => {
  const attempt = quizDiscardRunner(true, false, true);

  assert.equal(attempt.guard(), true);
  assert.equal(attempt.confirmationCalls(), 0);
  assert.deepEqual(attempt.cleared, []);
});

test('el envío en curso bloquea la navegación hasta guardar el test', () => {
  const attempt = quizDiscardRunner(true, false, false, true);

  assert.equal(attempt.guard(), false);
  assert.equal(attempt.confirmationCalls(), 0);
  assert.equal(attempt.context.quizTimer, 42);
  assert.equal(attempt.context.quizSubmissionPending, true);
  assert.match(attempt.messages[0][0], /guardando tu test/i);
});

test('la app protege reconfiguración, navegación, cierre y salida del navegador', () => {
  assert.ok(panel.includes('onclick="quizReturnToConfig()"'));
  assert.ok(panel.includes("async function render(page){\n  if(!confirmDiscardQuizAttempt())return;"));
  assert.ok(panel.includes('async function logout(){if(!confirmDiscardQuizAttempt())return;'));
  assert.ok(panel.includes("window.addEventListener('beforeunload',e=>{if(hasUnsubmittedQuizAttempt())"));
  const submitStart = panel.indexOf('async function submitQuiz(e)');
  const submitEnd = panel.indexOf('// planView:', submitStart);
  assert.ok(submitStart >= 0 && submitEnd > submitStart);
  assert.ok(panel.slice(submitStart, submitEnd).includes('quizSubmissionPending=true;'));
  assert.ok(panel.slice(submitStart, submitEnd).includes('finally{quizSubmissionPending=false}'));
});

test('Aula, Diagnóstico y Espacio de estudio siguen accesibles desde Más', () => {
  const menuStart = panel.indexOf('id="navMoreMenu"');
  const menuEnd = panel.indexOf('</div>', menuStart);
  assert.ok(menuStart >= 0 && menuEnd > menuStart);
  const menu = panel.slice(menuStart, menuEnd);
  assert.ok(menu.includes('<a class="nav-item" href="/aula.html">Aula e IDE</a>'));
  assert.ok(menu.includes('<a class="nav-item" href="/estudio.html">Espacio de estudio</a>'));
  assert.ok(menu.includes('<a class="nav-item" href="/diagnostico.html">Diagnóstico y ayuda</a>'));
});

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
  assert.match(panel, /registrationEnabled=config\.registrationOpen===true/);
  assert.match(panel, /api\('\/api\/config'\)\.then\(applyRegistrationConfig\)/);
  assert.doesNotMatch(panel, /registrationEnabled=health\.registrationEnabled/);
  assert.match(panel, /authSubmit'\)\.disabled=reg&&!registrationEnabled/);
  assert.match(panel, /const me=await api\('\/api\/me'\)/);
  assert.match(panel, /api\('\/api\/config'\)\.then\(config=>/);
  assert.doesNotMatch(panel, /Promise\.all\(\[api\('\/api\/me'\),api\('\/api\/catalog'\),api\('\/api\/config'\)\]\)/);
  assert.doesNotMatch(panel, /Si la olvidas, aún no podrás recuperarla desde la aplicación/);
});

test('la configuración pública controla el alta con un booleano estricto', () => {
  const start = panel.indexOf('function applyRegistrationConfig(config){');
  const end = panel.indexOf('\n', start);
  assert.ok(start >= 0 && end > start);
  const calls = [];
  const context = {
    registrationEnabled: false,
    authAction: 'register',
    authMode: () => calls.push(context.authAction)
  };
  const apply = vm.runInNewContext(panel.slice(start, end) + '\napplyRegistrationConfig;', context);
  apply({registrationOpen: true});
  assert.equal(context.registrationEnabled, true);
  apply({registrationOpen: false});
  assert.equal(context.registrationEnabled, false);
  apply({registrationOpen: 1});
  assert.equal(context.registrationEnabled, false);
  assert.deepEqual(calls, ['register', 'register', 'register']);
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

test('el único .txt del repositorio son los requisitos y los enlaces locales a documentos funcionan', () => {
  const repositoryRoot = path.join(root, '..');
  const trackedFiles = execFileSync('git', ['ls-files', '--cached', '-z'], {
    cwd: repositoryRoot,
    encoding: 'utf8'
  }).split('\0').filter(Boolean).map(file => file.replace(/\\/g, '/'));
  const textFiles = trackedFiles.filter(file => file.toLowerCase().endsWith('.txt')).sort();
  assert.deepEqual(textFiles, ['CodigoClaro_v3/requirements-docs.txt']);

  const publicRoot = path.join(root, 'public');
  const walk = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
  const brokenLinks = [];
  for (const file of walk(publicRoot).filter(file => file.toLowerCase().endsWith('.html'))) {
    const markup = fs.readFileSync(file, 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[\s\S]*?<\/style>/gi, '');
    for (const match of markup.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi)) {
      const reference = match[2].trim();
      const documentPath = reference.split(/[?#]/, 1)[0];
      if (!documentPath || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(documentPath)) continue;
      if (!/\.(?:md|txt)$/i.test(documentPath)) continue;
      let decodedPath;
      try {
        decodedPath = decodeURIComponent(documentPath);
      } catch {
        brokenLinks.push({ from: path.relative(publicRoot, file), href: reference });
        continue;
      }
      const target = decodedPath.startsWith('/')
        ? path.resolve(publicRoot, '.' + decodedPath)
        : path.resolve(path.dirname(file), decodedPath);
      const relative = path.relative(publicRoot, target);
      if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative) || !fs.existsSync(target)) {
        brokenLinks.push({ from: path.relative(publicRoot, file), href: reference });
      }
    }
  }
  assert.deepEqual(brokenLinks, []);
});
