"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const panel = fs.readFileSync(path.join(__dirname, "../public/index.html"), "utf8");
const start = panel.indexOf("function clearPrivateSessionState(){");
const end = panel.indexOf("\n$('appNavBar').addEventListener", start);
assert.ok(start >= 0 && end > start, "se debe encontrar la función de cierre de sesión");

function setup(apiCall) {
  const messages = [];
  const controls = {
    topAuth: { disabled: false, textContent: "Cerrar sesión", onclick: null },
    status: { textContent: "Sesión activa" },
    appSection: { classList: { added: [], add(value) { this.added.push(value); } } },
    main: { cleared: false, replaceChildren() { this.cleared = true; } }
  };
  const context = {
    confirmDiscardQuizAttempt: () => true,
    api: apiCall,
    user: { email: "alumno@example.test" },
    progress: { xp: 20, completed: ["Java:1"], attempts: [1] },
    adminData: {users:[{email:"admin@example.test"}]},
    sessionGeneration: 0,
    activeQuiz: {private:true},
    activeReviewTopics: ["tema"],
    lastWrongQuiz: ["pregunta"],
    quizTimer: null,
    clearInterval() {},
    logoutPending: false,
    $: id => controls[id],
    showAuth() {},
    showLanding() { context.landingShown = true; },
    flash(message, kind) { messages.push([message, kind]); }
  };
  const logout = vm.runInNewContext(panel.slice(start, end) + "\nlogout;", context);
  return { context, controls, messages, logout };
}

test("un error del servidor conserva la sesión local y comunica el fallo", async () => {
  const state = setup(async () => { throw new Error("No se pudo conectar con CódigoClaro."); });
  await state.logout();
  assert.equal(state.context.user.email, "alumno@example.test");
  assert.equal(state.controls.status.textContent, "Sesión activa");
  assert.deepEqual(state.controls.appSection.classList.added, []);
  assert.equal(state.controls.topAuth.disabled, false);
  assert.equal(state.messages[0][1], "error");
});

test("solo limpia la sesión tras recibir confirmación del servidor", async () => {
  const state = setup(async () => ({ ok: true }));
  await state.logout();
  assert.equal(state.context.user, null);
  assert.equal(state.controls.status.textContent, "Sesión cerrada");
  assert.deepEqual(state.controls.appSection.classList.added, ["hidden"]);
  assert.equal(state.controls.main.cleared, true);
  assert.equal(state.context.adminData, null);
  assert.equal(state.context.activeQuiz, null);
  assert.equal(state.context.activeReviewTopics.length, 0);
  assert.equal(state.context.lastWrongQuiz.length, 0);
  assert.equal(state.context.sessionGeneration, 1);
  assert.equal(state.context.landingShown, true);
  assert.deepEqual(state.messages.at(-1), ["Has cerrado sesión.", undefined]);
});

test("una respuesta exitosa que no confirma el cierre no se presenta como logout", async () => {
  const state = setup(async () => ({}));
  await state.logout();
  assert.equal(state.context.user.email, "alumno@example.test");
  assert.equal(state.controls.status.textContent, "Sesión activa");
  assert.equal(state.messages[0][1], "error");
});

test("un panel administrativo que responde después del logout no vuelve a pintar datos privados", async () => {
  let resolveOverview;
  const context = {
    sessionGeneration: 0,
    user: {role:"admin"},
    adminData: null,
    api: () => new Promise(resolve => { resolveOverview = resolve; }),
    $: () => { throw new Error("No se debe volver a tocar el DOM después del cierre"); },
    esc: value => String(value),
    adminContentView: async () => {}
  };
  const start = panel.indexOf("async function adminView(){");
  const end = panel.indexOf("\n// adminContentView", start);
  assert.ok(start >= 0 && end > start);
  const adminView = vm.runInNewContext(panel.slice(start,end) + "\nadminView;", context);
  const pending = adminView();
  context.sessionGeneration++;
  context.user = null;
  resolveOverview({users:[],feedback:[],totals:{},activity:[]});
  await pending;
  assert.equal(context.adminData, null);
});
