'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const panel = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const aula = fs.readFileSync(path.join(root, 'public/aula.html'), 'utf8');

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

test('fetch de API muestra errores de red y HTTP con la ruta', () => {
  assert.match(panel, /No se pudo conectar con \$\{url\}/);
  assert.match(aula, /No se pudo conectar con '\+url/);
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
  assert.match(run, /La compilación real necesita un JDK\/runtime local/);
  assert.doesNotMatch(run, /ideRunJudge0\(\)/);
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
  const match = aula.match(/const Q=(\[.*?\]);\nconst ccMemoryStorage/s);
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
