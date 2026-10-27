/** CódigoClaro — Lógica del espacio de estudio del navegador: tareas, temporizador, estadísticas y copias de seguridad. Los datos se validan antes de importarse y se guardan localmente. */
'use strict';
const STORAGE_KEY = 'codigoclaro.estudio.v1';
const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

/** Convierte un valor a texto, elimina espacios externos y limita su longitud. */
function safeText(value, max = 120) { return String(value ?? '').trim().slice(0, max); }
/** Genera un identificador de tarea para el almacenamiento local. */
function makeId() { return `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
/** Valida y normaliza los campos permitidos de una tarea importada o creada. */
function normalizeTask(task) {
  if (!task || typeof task !== 'object') return null;
  const title = safeText(task.title);
  if (!title) return null;
  const duration = Number(task.duration);
  return { id: safeText(task.id, 80) || makeId(), title, duration: [15,25,30,45,60,90].includes(duration) ? duration : 25, done: task.done === true, createdAt: typeof task.createdAt === 'string' ? task.createdAt : new Date().toISOString() };
}
/** Normaliza el estado completo del espacio de estudio y limita colecciones inesperadas. */
function normalizeState(value) {
  const source = value && typeof value === 'object' ? value : {};
  const tasks = Array.isArray(source.tasks) ? source.tasks.slice(0, 500).map(normalizeTask).filter(Boolean) : [];
  const sessions = Array.isArray(source.sessions) ? source.sessions.slice(-2000).filter(s => s && typeof s === 'object' && Number.isFinite(Date.parse(s.completedAt))).map(s => ({ completedAt: new Date(s.completedAt).toISOString(), seconds: Math.max(0, Math.min(24 * 3600, Math.floor(Number(s.seconds) || FOCUS_SECONDS))) })) : [];
  return { tasks, sessions };
}
/** Convierte segundos en el formato legible minutos:segundos. */
function formatTime(seconds) { const safe = Math.max(0, Math.floor(Number(seconds) || 0)); return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`; }
/** Comprueba si una fecha válida cae en el mismo día local que la fecha de referencia. */
function isSameLocalDay(dateValue, now = new Date()) { const d = new Date(dateValue); return !Number.isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate(); }
/** Calcula sesiones, minutos y tareas completadas para el resumen diario. */
function todayStats(state, now = new Date()) { const sessions = state.sessions.filter(s => isSameLocalDay(s.completedAt, now)); return { sessions: sessions.length, minutes: Math.floor(sessions.reduce((sum, s) => sum + s.seconds, 0) / 60), done: state.tasks.filter(t => t.done).length, total: state.tasks.length }; }
/** Valida una copia JSON exportada antes de aceptar sus tareas y sesiones. */
function parseImport(text) { if (typeof text !== 'string' || text.length > 1_000_000) throw new Error('El archivo debe ser JSON y no superar 1 MB.'); let data; try { data = JSON.parse(text); } catch { throw new Error('El archivo no contiene JSON válido.'); } if (data?.format !== 'codigoclaro-estudio-v1' || !data.data || typeof data.data !== 'object') throw new Error('El formato no corresponde a una copia de CódigoClaro Estudio.'); return normalizeState(data.data); }

if (typeof module !== 'undefined' && module.exports) module.exports = { safeText, normalizeTask, normalizeState, formatTime, isSameLocalDay, todayStats, parseImport, FOCUS_SECONDS, BREAK_SECONDS };

if (typeof document !== 'undefined') (() => {
  const $ = id => document.getElementById(id);
  const state = { data: { tasks: [], sessions: [] }, mode: 'focus', remaining: FOCUS_SECONDS, running: false, deadline: 0, interval: null, filter: 'all' };
  const today = new Date();
  $('todayDate').textContent = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }).format(today);
  function message(id, text, error = false) { const el = $(id); el.textContent = text; el.classList.toggle('error', error); }
  function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data)); return true; } catch { message('taskMessage', 'No se ha podido guardar. Comprueba el almacenamiento del navegador.', true); return false; } }
  function load() { try { const raw = localStorage.getItem(STORAGE_KEY); state.data = normalizeState(raw ? JSON.parse(raw) : {}); } catch { state.data = { tasks: [], sessions: [] }; message('taskMessage', 'Los datos guardados no se han podido leer. Se inicia un espacio nuevo.', true); } }
  function renderTasks() {
    const list = $('taskList'); list.replaceChildren();
    const tasks = state.data.tasks.filter(t => state.filter === 'all' || (state.filter === 'open' ? !t.done : t.done));
    if (!tasks.length) { const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = state.filter === 'done' ? 'Todavía no has completado tareas.' : state.filter === 'open' ? 'No tienes tareas pendientes. ¡Buen trabajo!' : 'Añade tu primer objetivo para organizar la sesión.'; list.append(empty); }
    for (const task of tasks) {
      const article = document.createElement('article'); article.className = `task${task.done ? ' done' : ''}`;
      const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done; check.setAttribute('aria-label', `Marcar ${task.title} como completada`); check.addEventListener('change', () => { task.done = check.checked; persist(); render(); });
      const content = document.createElement('div'); content.className = 'task-title'; const title = document.createElement('span'); title.textContent = task.title; const detail = document.createElement('small'); detail.textContent = `${task.duration} min · ${task.done ? 'Completada' : 'Pendiente'}`; content.append(title, detail);
      const del = document.createElement('button'); del.type = 'button'; del.className = 'delete'; del.textContent = 'Eliminar'; del.setAttribute('aria-label', `Eliminar ${task.title}`); del.addEventListener('click', () => { state.data.tasks = state.data.tasks.filter(t => t.id !== task.id); persist(); render(); message('taskMessage', 'Tarea eliminada.'); });
      article.append(check, content, del); list.append(article);
    }
    const stats = todayStats(state.data); $('focusCount').textContent = stats.sessions; $('focusMinutes').textContent = `${stats.minutes} min`; $('taskCount').textContent = `${stats.done}/${stats.total}`; $('dailySummary').textContent = `${stats.sessions} sesiones completadas · ${stats.minutes} minutos de concentración.`;
  }
  function renderTimer() { $('timeDisplay').textContent = formatTime(state.remaining); $('startPause').textContent = state.running ? 'Pausar sesión' : 'Empezar sesión'; document.title = `${formatTime(state.remaining)} · Estudio CódigoClaro`; }
  function stopTimer() { state.running = false; if (state.interval) clearInterval(state.interval); state.interval = null; }
  function tick() { state.remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000)); if (state.remaining <= 0) { stopTimer(); if (state.mode === 'focus') { state.data.sessions.push({ completedAt: new Date().toISOString(), seconds: FOCUS_SECONDS }); state.data.sessions = state.data.sessions.slice(-2000); persist(); message('timerMessage', '¡Sesión completada! Tómate un descanso.'); } else message('timerMessage', 'Descanso terminado. Cuando quieras, empieza otro bloque.'); renderTasks(); } renderTimer(); }
  function setMode(mode) { stopTimer(); state.mode = mode === 'break' ? 'break' : 'focus'; state.remaining = state.mode === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS; document.querySelectorAll('.mode-btn').forEach(btn => { const active = btn.dataset.mode === state.mode; btn.classList.toggle('primary', active); btn.setAttribute('aria-pressed', String(active)); }); message('timerMessage', ''); renderTimer(); }
  $('startPause').addEventListener('click', () => { if (state.running) { state.remaining = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000)); stopTimer(); } else { state.running = true; state.deadline = Date.now() + state.remaining * 1000; state.interval = setInterval(tick, 250); message('timerMessage', state.mode === 'focus' ? 'Sesión de concentración en marcha.' : 'Descanso en marcha.'); } renderTimer(); });
  $('resetTimer').addEventListener('click', () => { setMode(state.mode); message('timerMessage', 'Temporizador reiniciado.'); });
  document.querySelectorAll('.mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));
  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => { state.filter = btn.dataset.filter; document.querySelectorAll('.filter-btn').forEach(b => { const active = b === btn; b.classList.toggle('primary', active); b.setAttribute('aria-pressed', String(active)); }); renderTasks(); }));
  $('taskForm').addEventListener('submit', event => { event.preventDefault(); const title = safeText($('taskTitle').value); if (!title) return message('taskMessage', 'Escribe una tarea antes de añadirla.', true); state.data.tasks.unshift(normalizeTask({ title, duration: Number($('taskDuration').value), done: false })); if (persist()) { $('taskTitle').value = ''; renderTasks(); message('taskMessage', 'Tarea añadida.'); $('taskTitle').focus(); } });
  $('clearDone').addEventListener('click', () => { const before = state.data.tasks.length; state.data.tasks = state.data.tasks.filter(t => !t.done); persist(); renderTasks(); message('taskMessage', `${before - state.data.tasks.length} tareas completadas eliminadas.`); });
  $('clearAll').addEventListener('click', () => { if (!window.confirm('Esto borrará las tareas y sesiones guardadas en este navegador. ¿Continuar?')) return; state.data = { tasks: [], sessions: [] }; persist(); setMode('focus'); renderTasks(); message('taskMessage', 'Espacio restablecido.'); });
  $('exportData').addEventListener('click', () => { const payload = { format: 'codigoclaro-estudio-v1', exportedAt: new Date().toISOString(), data: state.data }; const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'codigoclaro-estudio.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); message('taskMessage', 'Copia JSON descargada.'); });
  $('importFile').addEventListener('change', async event => { const file = event.target.files?.[0]; if (!file) return; try { const imported = parseImport(await file.text()); if (!window.confirm('La importación sustituirá las tareas y sesiones actuales. ¿Continuar?')) return; state.data = imported; persist(); renderTasks(); message('taskMessage', 'Copia importada correctamente.'); } catch (error) { message('taskMessage', error.message || 'No se pudo importar la copia.', true); } finally { event.target.value = ''; } });
  window.addEventListener('beforeunload', stopTimer);
  load(); renderTasks(); renderTimer();
})();
