/** CódigoClaro — Pruebas unitarias y de interfaz del espacio de estudio: tareas, temporizador, importación y estadísticas. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const study = require('../public/estudio.js');
const html = fs.readFileSync(path.join(__dirname, '../public/estudio.html'), 'utf8');

test('el espacio de estudio es una página autónoma con idioma, viewport y recursos locales', () => {
  assert.match(html, /<html lang="es">/);
  assert.match(html, /name="viewport"/);
  assert.match(html, /<title>Espacio de estudio/);
  assert.match(html, /src="\/estudio\.js"/);
  assert.doesNotMatch(html, /https?:\/\/(?:cdn\.|unpkg|cdnjs)/i);
});
test('la página usa los tokens editoriales y respeta movimiento reducido', () => {
  for (const token of ['#faf9f6', '#f1eee9', '#dedbd6', '#111111', '#0007cb']) assert.ok(html.toLowerCase().includes(token), `falta ${token}`);
  assert.match(html, /border-radius:\s*4px/i);
  assert.match(html, /font-weight:\s*300/i);
  assert.match(html, /prefers-reduced-motion:\s*reduce/i);
});
test('la interfaz incluye temporizador, tareas, filtros, importación y exportación', () => {
  for (const id of ['timeDisplay','startPause','resetTimer','taskForm','taskTitle','taskList','clearDone','clearAll','exportData','importFile']) assert.ok(html.includes(`id="${id}"`), `falta ${id}`);
  assert.match(html, /aria-live="polite"/);
  assert.match(fs.readFileSync(path.join(__dirname, '../public/estudio.js'), 'utf8'), /localStorage/);
});
test('formatTime controla valores negativos, decimales y tiempos largos', () => {
  assert.equal(study.formatTime(0), '00:00');
  assert.equal(study.formatTime(65), '01:05');
  assert.equal(study.formatTime(3599.9), '59:59');
  assert.equal(study.formatTime(-8), '00:00');
  assert.equal(study.formatTime('no'), '00:00');
  assert.equal(study.formatTime(3600), '60:00');
});
test('normalizeTask rechaza entradas vacías y limpia títulos', () => {
  assert.equal(study.normalizeTask(null), null);
  assert.equal(study.normalizeTask({ title: '   ' }), null);
  const task = study.normalizeTask({ title: '  Practicar Java  ', duration: 45, done: 1, id: 'abc' });
  assert.equal(task.title, 'Practicar Java');
  assert.equal(task.duration, 45);
  assert.equal(task.done, false);
  assert.equal(task.id, 'abc');
});
test('normalizeTask aplica duración predeterminada y limita títulos', () => {
  const task = study.normalizeTask({ title: 'x'.repeat(200), duration: 999, done: true });
  assert.equal(task.title.length, 120);
  assert.equal(task.duration, 25);
  assert.equal(task.done, true);
  assert.ok(task.id.length > 0);
});
test('normalizeState valida estructuras y limita colecciones', () => {
  assert.deepEqual(study.normalizeState(null), { tasks: [], sessions: [] });
  const state = study.normalizeState({ tasks: [{title:'A'}, {}, {title:'B'}], sessions: [{completedAt:'bad'}, {completedAt:'2026-10-22T10:00:00Z', seconds:99}] });
  assert.equal(state.tasks.length, 2);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].seconds, 99);
  const bounded = study.normalizeState({ tasks: Array.from({length:510}, (_,i)=>({title:`T${i}`})), sessions: [] });
  assert.equal(bounded.tasks.length, 500);
});
test('normalización de sesiones limita duraciones y normaliza fecha ISO', () => {
  const state = study.normalizeState({ sessions: [{ completedAt:'2026-10-22T10:00:00Z', seconds:999999 }] });
  assert.equal(state.sessions[0].seconds, 86400);
  assert.equal(state.sessions[0].completedAt, '2026-10-22T10:00:00.000Z');
});
test('todayStats calcula sesiones, minutos y tareas completadas', () => {
  const now = new Date(2026, 9, 22, 12, 0, 0);
  const state = { tasks:[{done:true},{done:false},{done:true}], sessions:[{completedAt:new Date(2026,9,22,9).toISOString(),seconds:1500},{completedAt:new Date(2026,9,22,10).toISOString(),seconds:900},{completedAt:new Date(2026,9,21,10).toISOString(),seconds:1500}] };
  assert.deepEqual(study.todayStats(state, now), { sessions:2, minutes:40, done:2, total:3 });
});
test('isSameLocalDay identifica el mismo día y rechaza fechas inválidas', () => {
  const now = new Date(2026, 9, 22, 12);
  assert.equal(study.isSameLocalDay(new Date(2026,9,22,1).toISOString(), now), true);
  assert.equal(study.isSameLocalDay(new Date(2026,9,21,23).toISOString(), now), false);
  assert.equal(study.isSameLocalDay('no-es-fecha', now), false);
});
test('parseImport acepta una copia válida y normaliza sus datos', () => {
  const parsed = study.parseImport(JSON.stringify({format:'codigoclaro-estudio-v1',data:{tasks:[{title:'SQL',duration:30}],sessions:[]}}));
  assert.equal(parsed.tasks[0].title, 'SQL');
  assert.equal(parsed.tasks[0].duration, 30);
});
test('parseImport rechaza JSON roto, formato incorrecto y archivos demasiado grandes', () => {
  assert.throws(() => study.parseImport('{'), /JSON válido/);
  assert.throws(() => study.parseImport(JSON.stringify({format:'otro',data:{}})), /formato/);
  assert.throws(() => study.parseImport('x'.repeat(1_000_001)), /1 MB/);
});
test('el JavaScript no usa HTML dinámico para insertar títulos de tareas', () => {
  const js = fs.readFileSync(path.join(__dirname, '../public/estudio.js'), 'utf8');
  assert.match(js, /title\.textContent\s*=\s*task\.title/);
  assert.doesNotMatch(js, /innerHTML\s*=.*task\.title/s);
  assert.match(js, /window\.confirm\(/);
});

test('la interfaz del espacio de estudio se inicializa y añade tareas sin HTML inyectado', async () => {
  const vm = require('node:vm');
  const js = fs.readFileSync(path.join(__dirname, '../public/estudio.js'), 'utf8');
  class FakeClassList {
    constructor() { this.values = new Set(); }
    toggle(name, force) { if (force === undefined ? !this.values.has(name) : force) this.values.add(name); else this.values.delete(name); }
  }
  class FakeElement {
    constructor(id='') { this.id=id; this.value=''; this.textContent=''; this.checked=false; this.dataset={}; this.children=[]; this.listeners={}; this.classList=new FakeClassList(); this.attrs={}; this.files=[]; this.className=''; }
    addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
    fire(type, event={}) { for (const fn of this.listeners[type] || []) fn({target:this, preventDefault(){}, ...event}); }
    setAttribute(k,v) { this.attrs[k]=String(v); }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children=[...nodes]; }
    focus() {}
    click() {}
  }
  const ids = ['todayDate','dailySummary','timeDisplay','startPause','resetTimer','timerMessage','focusCount','focusMinutes','taskCount','taskForm','taskTitle','taskDuration','taskList','taskMessage','clearDone','clearAll','exportData','importFile'];
  const elements = Object.fromEntries(ids.map(id=>[id,new FakeElement(id)]));
  elements.taskDuration.value='25'; elements.taskTitle.value='Repasar Java';
  const modes=['focus','break'].map(mode=>{const e=new FakeElement();e.dataset.mode=mode;return e;});
  const filters=['all','open','done'].map(filter=>{const e=new FakeElement();e.dataset.filter=filter;return e;});
  const store = new Map();
  const document = { title:'', getElementById:id=>elements[id] ||= new FakeElement(id), createElement:tag=>new FakeElement(tag), querySelectorAll(selector){return selector==='.mode-btn'?modes:selector==='.filter-btn'?filters:[];} };
  const window = { confirm:()=>true, addEventListener(){} };
  const context = { document, window, localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}, Date, Math, Intl, JSON, String, Number, Array, Object, Error, setInterval, clearInterval, Blob, URL, console };
  vm.runInNewContext(js, context, {timeout:1000});
  assert.equal(elements.timeDisplay.textContent,'25:00');
  elements.taskForm.fire('submit');
  assert.equal(elements.taskList.children.length,1);
  assert.equal(elements.taskList.children[0].children[1].children[0].textContent,'Repasar Java');
  assert.ok(store.has('codigoclaro.estudio.v1'));
  filters[1].fire('click');
  assert.equal(elements.taskList.children.length, 1);
  assert.equal(elements.taskList.children[0].children[1].children[0].textContent, 'Repasar Java');
  elements.startPause.fire('click');
  assert.equal(elements.startPause.textContent,'Pausar sesión');
  elements.startPause.fire('click');
  assert.equal(elements.startPause.textContent,'Empezar sesión');
  modes[1].fire('click');
  assert.equal(elements.timeDisplay.textContent,'05:00');
  elements.resetTimer.fire('click');
  assert.equal(elements.timeDisplay.textContent,'05:00');
});
