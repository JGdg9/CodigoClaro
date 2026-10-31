'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pricing = require('../public/premium-precios.js');
const pricingSource = fs.readFileSync(path.join(__dirname, '../public/premium-precios.js'), 'utf8');

function assertClose(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < 1e-12, `${label}: esperado ${expected}, recibido ${actual}`);
}

test('calcula el margen de los tres planes con los supuestos del módulo', () => {
  assert.deepEqual(pricing.assumptions, {
    vatRate: 0.21,
    inputTokensPerReply: 3000,
    outputTokensPerReply: 700,
    inputUsdPerMillion: 2,
    outputUsdPerMillion: 10,
    usdPerEur: 1.1172,
    billingRate: 0.007,
    europeanCardRate: 0.015,
    cardFixedFeeEur: 0.25
  });
  assert.deepEqual(pricing.plans.map(({ id, name, monthlyPriceEur, aiReplies }) => ({ id, name, monthlyPriceEur, aiReplies })), [
    { id: 'gratis', name: 'Gratis', monthlyPriceEur: 0, aiReplies: 0 },
    { id: 'estudiante', name: 'Estudiante', monthlyPriceEur: 4.99, aiReplies: 100 },
    { id: 'intensivo', name: 'Intensivo', monthlyPriceEur: 9.99, aiReplies: 250 }
  ]);

  const expectedMargins = { gratis: 0, estudiante: 2.6005635980742894, intensivo: 4.87735998692126 };
  const expectedAiCostPerReply = (3000 * 2 + 700 * 10) / 1_000_000 / 1.1172;

  for (const plan of pricing.plans) {
    const estimate = pricing.estimatePlan(plan.id);
    const expectedRevenue = plan.monthlyPriceEur / 1.21;
    const expectedFees = plan.monthlyPriceEur === 0
      ? 0
      : plan.monthlyPriceEur * (0.007 + 0.015) + 0.25;
    const expectedAiCost = plan.aiReplies * expectedAiCostPerReply;
    const expectedMargin = expectedRevenue - expectedFees - expectedAiCost;

    assertClose(estimate.netRevenueEur, expectedRevenue, `${plan.name}: ingresos sin IVA`);
    assertClose(estimate.paymentFeesEur, expectedFees, `${plan.name}: comisiones`);
    assertClose(estimate.aiCostEur, expectedAiCost, `${plan.name}: coste de IA`);
    assertClose(estimate.marginEur, expectedMargin, `${plan.name}: margen`);
    assertClose(estimate.marginEur, expectedMargins[plan.id], `${plan.name}: margen esperado`);
    assertClose(estimate.marginFor100Eur, expectedMargin * 100, `${plan.name}: margen para 100 cuentas`);
  }
});

test('seleccionar cualquiera de los planes no realiza peticiones de red', () => {
  const networkCalls = [];
  const blockNetwork = (surface) => () => {
    networkCalls.push(surface);
    throw new Error(`La calculadora no debe usar la red (${surface}).`);
  };
  const blockNetworkConstructor = (surface) => class {
    constructor() {
      networkCalls.push(surface);
      throw new Error(`La calculadora no debe usar la red (${surface}).`);
    }
  };

  const attributes = (initial = {}) => ({ ...initial });
  const makeClassList = () => {
    const names = new Set();
    return {
      toggle(name, force) {
        if (force) names.add(name);
        else names.delete(name);
      },
      contains(name) {
        return names.has(name);
      }
    };
  };
  const cards = new Map(pricing.plans.map((plan) => [plan.id, { classList: makeClassList() }]));
  const buttons = pricing.plans.map((plan) => {
    const listeners = new Map();
    const attrs = attributes({ 'aria-pressed': String(plan.id === 'estudiante') });
    return {
      dataset: { premiumPlan: plan.id },
      listeners,
      classList: makeClassList(),
      getAttribute(name) {
        return attrs[name] ?? null;
      },
      setAttribute(name, value) {
        attrs[name] = value;
      },
      addEventListener(name, handler) {
        listeners.set(name, handler);
      },
      closest(selector) {
        assert.equal(selector, '[data-premium-card]');
        return cards.get(plan.id);
      }
    };
  });
  const cardMargins = pricing.plans.map((plan) => ({
    dataset: { premiumCardMargin: plan.id },
    textContent: ''
  }));
  const elements = new Map([
    ['premiumEstimateTitle', { textContent: '' }],
    ['premiumEstimateCopy', { textContent: '' }],
    ['premiumMarginPerUser', { textContent: '' }],
    ['premiumMarginFor100', { textContent: '' }]
  ]);
  const labels = new Map([
    ['[data-premium-peruser-label]', { textContent: '' }],
    ['[data-premium-for100-label]', { textContent: '' }]
  ]);
  const section = {
    querySelectorAll(selector) {
      if (selector === '[data-premium-plan]') return buttons;
      if (selector === '[data-premium-card-margin]') return cardMargins;
      throw new Error(`Selector inesperado: ${selector}`);
    },
    querySelector(selector) {
      return labels.get(selector) || null;
    }
  };
  const window = {
    document: {
      getElementById(id) {
        return id === 'premium' ? section : elements.get(id) || null;
      }
    },
    fetch: blockNetwork('window.fetch'),
    XMLHttpRequest: blockNetworkConstructor('window.XMLHttpRequest'),
    WebSocket: blockNetworkConstructor('window.WebSocket'),
    EventSource: blockNetworkConstructor('window.EventSource'),
    navigator: { sendBeacon: blockNetwork('window.navigator.sendBeacon') }
  };

  vm.runInNewContext(pricingSource, {
    window,
    fetch: blockNetwork('global.fetch'),
    XMLHttpRequest: blockNetworkConstructor('global.XMLHttpRequest'),
    WebSocket: blockNetworkConstructor('global.WebSocket'),
    EventSource: blockNetworkConstructor('global.EventSource'),
    navigator: { sendBeacon: blockNetwork('global.navigator.sendBeacon') }
  });

  const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  for (const button of buttons) {
    button.listeners.get('click')();
    const planId = button.dataset.premiumPlan;
    assert.equal(elements.get('premiumMarginPerUser').textContent, money.format(pricing.estimatePlan(planId).marginEur));
    assert.equal(button.getAttribute('aria-pressed'), 'true');
    assert.equal(cards.get(planId).classList.contains('is-selected'), true);
    assert.equal(button.classList.contains('primary'), true);
    assert.deepEqual(networkCalls, []);
  }
});
