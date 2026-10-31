'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.join(__dirname, '../public/premium-piloto.html');
const page = fs.readFileSync(pagePath, 'utf8');
const scriptMatch = page.match(/<script>([\s\S]*?)<\/script>/i);
const storageKey = 'codigoclaro.premiumPilot.project.v1';

assert.ok(scriptMatch, 'la página debe tener el script del proyecto piloto');
const pilotScript = scriptMatch[1];

function createPilot(storage = new Map()) {
  const elements = new Map();
  let networkCalls = 0;

  function getElementById(id) {
    if (!elements.has(id)) {
      const attributes = {};
      const classes = new Set(id === 'projectSection' ? ['hidden'] : []);
      const element = {
        textContent: '',
        innerHTML: '',
        style: {},
        attributes,
        classList: {
          toggle(name, force) {
            if (force) classes.add(name);
            else classes.delete(name);
          },
          contains(name) {
            return classes.has(name);
          }
        },
        parentElement: {
          setAttribute(name, value) {
            attributes[name] = value;
          }
        },
        setAttribute(name, value) {
          attributes[name] = value;
        },
        scrollIntoView(options) {
          element.scrollOptions = options;
        },
        focus() {
          element.focused = true;
        }
      };
      elements.set(id, element);
    }
    return elements.get(id);
  }

  function forbiddenNetworkCall() {
    networkCalls += 1;
    throw new Error('La prueba local no debe realizar llamadas de red.');
  }

  class ForbiddenNetworkConstructor {
    constructor() {
      forbiddenNetworkCall();
    }
  }

  const sandbox = {
    document: { getElementById },
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      }
    },
    matchMedia() {
      return { matches: true };
    },
    confirm() {
      return true;
    },
    fetch: forbiddenNetworkCall,
    XMLHttpRequest: ForbiddenNetworkConstructor,
    WebSocket: ForbiddenNetworkConstructor,
    EventSource: ForbiddenNetworkConstructor,
    navigator: { sendBeacon: forbiddenNetworkCall }
  };

  const api = vm.runInNewContext(
    `${pilotScript}\n;({ startPilot, toggleStep, resetPilot });`,
    sandbox
  );

  return { api, elements, storage, get networkCalls() { return networkCalls; } };
}

test('el piloto inicia, guarda y reanuda el avance en almacenamiento local', () => {
  const storage = new Map();
  const pilot = createPilot(storage);
  const section = pilot.elements.get('projectSection');
  const button = pilot.elements.get('startButton');

  assert.equal(section.classList.contains('hidden'), true);
  assert.equal(button.textContent, 'Activar demo local · sin pago');

  pilot.api.startPilot();
  assert.equal(section.classList.contains('hidden'), false);
  assert.equal(button.textContent, 'Continuar demo local');
  assert.deepEqual(JSON.parse(storage.get(storageKey)), { started: true, completed: [] });
  assert.equal(section.scrollOptions.behavior, 'auto');
  assert.equal(section.scrollOptions.block, 'start');

  pilot.api.toggleStep('model', true);
  assert.deepEqual(JSON.parse(storage.get(storageKey)), { started: true, completed: ['model'] });
  assert.equal(pilot.elements.get('progressText').textContent, '1 de 4 entregas marcadas como completadas.');
  assert.equal(pilot.elements.get('progressBar').style.width, '25%');
  assert.equal(pilot.elements.get('progressBar').attributes['aria-valuenow'], '25');
  assert.match(pilot.elements.get('milestones').innerHTML, /id="step-model" type="checkbox" checked/);
  assert.equal(pilot.networkCalls, 0);

  const reloaded = createPilot(storage);
  assert.equal(reloaded.elements.get('projectSection').classList.contains('hidden'), false);
  assert.equal(reloaded.elements.get('startButton').textContent, 'Continuar demo local');
  assert.equal(reloaded.elements.get('progressText').textContent, '1 de 4 entregas marcadas como completadas.');
  assert.match(reloaded.elements.get('milestones').innerHTML, /id="step-model" type="checkbox" checked/);
  assert.equal(reloaded.networkCalls, 0);

  reloaded.api.resetPilot();
  assert.equal(storage.has(storageKey), false);
  assert.equal(reloaded.elements.get('projectSection').classList.contains('hidden'), true);
  assert.equal(reloaded.elements.get('startButton').textContent, 'Activar demo local · sin pago');
  assert.equal(reloaded.elements.get('startButton').focused, true);
  assert.equal(reloaded.networkCalls, 0);
});

test('la página comunica que la prueba es gratuita y no integra pagos ni red', () => {
  assert.match(page, /Prototipo gratuito · sin pagos activos/i);
  assert.match(page, /Los planes que aparecen en la portada son una propuesta y todavía no se pueden contratar\./i);
  assert.match(page, /No pedimos tarjeta ni generamos cargos\./i);
  assert.match(page, /Esta prueba no se conecta a servicios externos/i);
  assert.match(page, /se almacena únicamente en el almacenamiento local del navegador/i);
  assert.doesNotMatch(page, /margen|beneficio neto|rentabilidad|costes?|comisiones?|tarifas?|ingresos?|Stripe|OpenAI|tokens|USD|tipo de cambio|\bIVA\b/i);

  assert.doesNotMatch(page, /<form\b/i);
  assert.doesNotMatch(page, /<script\b[^>]*\bsrc\s*=/i);
  assert.doesNotMatch(page, /<input\b[^>]*\btype\s*=\s*["'](?:payment|credit-card|card-number)["']/i);
  assert.doesNotMatch(page, /\b(?:stripe|paypal|mercadopago|checkout\.com)\b/i);
  assert.doesNotMatch(pilotScript, /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\b|\bsendBeacon\s*\(/i);
});
