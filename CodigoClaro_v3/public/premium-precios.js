/* Estimación aislada de costes para la propuesta Premium. */
(function (root) {
  'use strict';

  const assumptions = Object.freeze({
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

  const plans = Object.freeze([
    Object.freeze({ id: 'gratis', name: 'Gratis', monthlyPriceEur: 0, aiReplies: 0 }),
    Object.freeze({ id: 'estudiante', name: 'Estudiante', monthlyPriceEur: 4.99, aiReplies: 100 }),
    Object.freeze({ id: 'intensivo', name: 'Intensivo', monthlyPriceEur: 9.99, aiReplies: 250 })
  ]);

  function estimatePlan(planId) {
    const plan = plans.find((item) => item.id === planId);
    if (!plan) throw new RangeError('Plan desconocido.');

    const price = plan.monthlyPriceEur;
    const netRevenue = price / (1 + assumptions.vatRate);
    const paymentFees = price === 0
      ? 0
      : price * (assumptions.billingRate + assumptions.europeanCardRate) + assumptions.cardFixedFeeEur;
    const aiCostPerReplyEur = (
      assumptions.inputTokensPerReply * assumptions.inputUsdPerMillion
      + assumptions.outputTokensPerReply * assumptions.outputUsdPerMillion
    ) / 1_000_000 / assumptions.usdPerEur;
    const aiCost = plan.aiReplies * aiCostPerReplyEur;

    return Object.freeze({
      ...plan,
      netRevenueEur: netRevenue,
      paymentFeesEur: paymentFees,
      aiCostEur: aiCost,
      marginEur: netRevenue - paymentFees - aiCost,
      marginFor100Eur: (netRevenue - paymentFees - aiCost) * 100
    });
  }

  const api = Object.freeze({ assumptions, plans, estimatePlan });
  root.CodigoClaroPremium = api;
  if (typeof module === 'object' && module.exports) module.exports = api;

  if (!root.document) return;
  const section = root.document.getElementById('premium');
  if (!section) return;

  const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const buttons = [...section.querySelectorAll('[data-premium-plan]')];
  const title = root.document.getElementById('premiumEstimateTitle');
  const copy = root.document.getElementById('premiumEstimateCopy');
  const perUser = root.document.getElementById('premiumMarginPerUser');
  const for100 = root.document.getElementById('premiumMarginFor100');
  const perUserLabel = section.querySelector('[data-premium-peruser-label]');
  const for100Label = section.querySelector('[data-premium-for100-label]');

  function selectPlan(planId) {
    const estimate = estimatePlan(planId);
    const label = planId === 'gratis' ? 'servicio actual' : 'escenario con cuota';

    buttons.forEach((button) => {
      const selected = button.dataset.premiumPlan === planId;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('primary', selected);
      button.closest('[data-premium-card]')?.classList.toggle('is-selected', selected);
    });

    section.querySelectorAll('[data-premium-card-margin]').forEach((target) => {
      target.textContent = `${money.format(estimatePlan(target.dataset.premiumCardMargin).marginEur)} / mes`;
    });

    title.textContent = `${estimate.name} · ${label}`;
    copy.textContent = planId === 'gratis'
      ? 'El tutor local no envía consultas a una API de IA. El cálculo no descuenta alojamiento ni costes fijos.'
      : `Margen con ${estimate.aiReplies} consultas y ${assumptions.inputTokensPerReply} tokens de entrada + ${assumptions.outputTokensPerReply} de salida por consulta. Son supuestos, no límites aplicados; el coste real puede ser mayor. No es beneficio neto.`;
    perUserLabel.textContent = planId === 'gratis' ? 'Por cuenta / mes' : 'Por suscriptor / mes';
    for100Label.textContent = planId === 'gratis' ? '100 cuentas, sin IA remota' : '100 suscriptores, mismo uso';
    perUser.textContent = money.format(estimate.marginEur);
    for100.textContent = money.format(estimate.marginFor100Eur);
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => selectPlan(button.dataset.premiumPlan));
  });
  selectPlan(buttons.find((button) => button.getAttribute('aria-pressed') === 'true')?.dataset.premiumPlan || plans[0].id);
})(typeof window === 'undefined' ? globalThis : window);
