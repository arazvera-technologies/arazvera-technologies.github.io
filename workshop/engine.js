/* ARAZVERA portfolio demonstration engine. Entirely fictional, in-memory; no network/storage. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WorkshopDemoEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const statuses = ['created', 'review', 'duplicate', 'invalid', 'backend-fault'];
  const evidenceStates = ['none', 'planned', 'passed-claimed', 'failed', 'blocked'];
  const options = [
    { id: 'pilot', name: 'Focused Pilot', amount: 650, currency: 'USD', days: 6, risk: 'Low', scope: 'One integration contract using mock API fixtures.', assumptions: 'A synthetic API contract is supplied.', exclusions: 'No production access or deployment.' },
    { id: 'standard', name: 'Technical Assessment', amount: 1050, currency: 'USD', days: 4, risk: 'Medium', scope: 'Contract map, retry scenarios and evidence matrix.', assumptions: 'An example sandbox is documented.', exclusions: 'No operational code handover.' },
    { id: 'extended', name: 'Extended Validation Plan', amount: 1750, currency: 'USD', days: 8, risk: 'Medium', scope: 'Expanded integration map and edge-case catalogue.', assumptions: 'Representative fake sample data is available.', exclusions: 'No independent security certification or live test run.' }
  ];
  const demoItems = [
    { id: 'DEMO-001', demo: true, title: 'Inventory synchronisation API', company: 'Fictional • Northstar Components', domain: 'API / Integration', source: 'Synthetic scenario', problem: 'Inventory events can arrive out of sequence during retries.', scope: 'Define a sandbox-only API contract and idempotent inventory sync plan.', qualification: 'Review pending — the simulated operator must record a decision.', status: 'review', selectedScenario: null, approval: { status: 'pending', reason: '' }, scenarios: copy(options), criteria: [
      { id: 'ac1', label: 'API payload contract is documented', status: 'planned' },
      { id: 'ac2', label: 'Idempotency strategy is explained', status: 'none' },
      { id: 'ac3', label: 'Retry failure cases are listed', status: 'none' },
      { id: 'ac4', label: 'Handover boundaries are explicit', status: 'none' }
    ], history: [{ type: 'intake', message: 'Fictional opportunity created for this demonstration.' }] },
    { id: 'DEMO-002', demo: true, title: 'Webhook delivery validation', company: 'Fictional • Meridian Systems', domain: 'Webhooks / Reliability', source: 'Synthetic scenario', problem: 'Duplicate notifications may cause repeated order updates.', scope: 'Prepare a delivery guarantee assessment using simulated webhook fixtures.', qualification: 'Synthetic opportunity awaits scoping.', status: 'created', selectedScenario: null, approval: { status: 'pending', reason: '' }, scenarios: copy(options.map(x => ({ ...x, amount: x.amount + 200, days: x.days + 1 }))), criteria: [
      { id: 'ac1', label: 'Idempotency boundaries are described', status: 'planned' },
      { id: 'ac2', label: 'Duplicate delivery paths are mapped', status: 'none' },
      { id: 'ac3', label: 'Sandbox verification steps are defined', status: 'none' }
    ], history: [{ type: 'intake', message: 'Fictional webhook example added.' }] },
    { id: 'DEMO-003', demo: true, title: 'Legacy service test-harness plan', company: 'Fictional • Juniper Labs', domain: 'Test Engineering', source: 'Synthetic scenario', problem: 'Service endpoints have no reusable acceptance checklist.', scope: 'Document a private regression test-harness plan without running external systems.', qualification: 'Synthetic scoping example.', status: 'backend-fault', selectedScenario: null, approval: { status: 'pending', reason: '' }, scenarios: copy(options.map(x => ({ ...x, amount: x.amount + 400, days: x.days + 2 }))), criteria: [
      { id: 'ac1', label: 'Test inventory is documented', status: 'none' },
      { id: 'ac2', label: 'Fixture ownership is specified', status: 'none' },
      { id: 'ac3', label: 'Acceptance evidence format is chosen', status: 'none' }
    ], history: [{ type: 'intake', message: 'Fictional backend-fault classification added.' }] }
  ];
  function fixtures() { return copy(demoItems); }
  function escapeHtml(value) { return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function log(lead, type, message) { lead.history.push({ type, message }); if (lead.history.length > 24) lead.history.shift(); return lead; }
  function applyQualification(raw, status, reason) {
    if (!statuses.includes(status)) throw Error('Unknown qualification status.');
    if (typeof reason !== 'string' || reason.trim().length < 8) throw Error('A qualification rationale of at least 8 characters is required.');
    const lead = copy(raw); lead.status = status; lead.qualification = reason.trim(); lead.approval = { status: 'pending', reason: '' };
    return log(lead, 'qualification', 'Operator classified this fictional example as ' + status + '.');
  }
  function chooseScenario(raw, id) {
    const lead = copy(raw);
    if (!lead.scenarios.some(x => x.id === id)) throw Error('Scenario does not belong to this example.');
    lead.selectedScenario = id; lead.approval = { status: 'pending', reason: '' };
    return log(lead, 'scenario', 'Selected ' + lead.scenarios.find(x => x.id === id).name + ' for the fictional internal plan.');
  }
  function setEvidence(raw, id, status) {
    if (!evidenceStates.includes(status)) throw Error('Invalid manual evidence status.');
    const lead = copy(raw), criterion = lead.criteria.find(x => x.id === id);
    if (!criterion) throw Error('Acceptance criterion does not belong to this example.');
    criterion.status = status; lead.approval = { status: 'pending', reason: '' };
    return log(lead, 'acceptance', 'Criterion "' + criterion.label + '" marked ' + status + ' (operator-reported).');
  }
  function readiness(lead) {
    const linked = lead.criteria.filter(x => x.status !== 'none').length;
    const issues = lead.criteria.some(x => x.status === 'failed' || x.status === 'blocked');
    const checks = [
      { id: 'qualification', label: 'Opportunity cleared by operator', passed: lead.status === 'created' },
      { id: 'scope', label: 'Scope and boundaries documented', passed: Boolean(lead.scope?.trim()) },
      { id: 'scenario', label: 'One planning scenario selected', passed: Boolean(lead.selectedScenario) },
      { id: 'criteria', label: 'Acceptance criteria defined', passed: lead.criteria.length > 0 },
      { id: 'evidence', label: 'Every criterion has a manual evidence plan', passed: lead.criteria.length > 0 && linked === lead.criteria.length },
      { id: 'issues', label: 'No failed or blocked manual evidence', passed: !issues },
      { id: 'approval', label: 'Internal drafting decision recorded', passed: lead.approval.status === 'approved' }
    ];
    return { checks, total: checks.length, passed: checks.filter(x => x.passed).length, linked, totalCriteria: lead.criteria.length,
      eligibleForInternalApproval: checks.slice(0, -1).every(x => x.passed), ready: checks.every(x => x.passed), independentlyVerified: false,
      missing: checks.filter(x => !x.passed).map(x => x.id) };
  }
  function approveInternal(raw, reason) {
    const lead = copy(raw);
    if (lead.status !== 'created') throw Error('Qualification must be cleared before internal approval.');
    if (!lead.selectedScenario) throw Error('Select a scenario before approval.');
    if (lead.criteria.some(x => x.status === 'failed' || x.status === 'blocked')) throw Error('Unresolved manual evidence issue blocks approval.');
    if (lead.criteria.some(x => x.status === 'none') || !lead.criteria.length) throw Error('Complete the acceptance evidence plan before approval.');
    if (typeof reason !== 'string' || reason.trim().length < 12) throw Error('A rationale of at least 12 characters is required.');
    lead.approval = { status: 'approved', reason: reason.trim() };
    return log(lead, 'approval', 'Internal-only preparation approved. No outbound action authorized.');
  }
  function scenarioComparison(lead) {
    const all = lead.scenarios;
    const comparable = all.length > 0 && all.every(x => Number.isFinite(x.amount) && x.amount > 0 && x.currency === all[0].currency && Number.isInteger(x.days) && x.days > 0);
    if (!comparable) return { comparable: false, currency: 'mixed/unknown', cheapest: null, fastest: null, minAmount: null, selectedPremium: null };
    const cheapest = all.reduce((a, b) => a.amount <= b.amount ? a : b), fastest = all.reduce((a, b) => a.days <= b.days ? a : b);
    const chosen = all.find(x => x.id === lead.selectedScenario);
    return { comparable: true, currency: all[0].currency, cheapest, fastest, minAmount: cheapest.amount, selectedPremium: chosen ? chosen.amount - cheapest.amount : null };
  }
  function formatMoney(amount, currency = 'USD') { return currency + ' ' + Number(amount).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
  function exportPackage(lead) {
    const state = readiness(lead), chosen = lead.scenarios.find(x => x.id === lead.selectedScenario) || null;
    return { demo: true, notice: 'FICTIONAL PORTFOLIO EXAMPLE — NOT A CUSTOMER ENGAGEMENT', outboundAuthorized: false, independentlyVerified: false,
      workflowStage: 'Internal draft preparation', reference: lead.id, title: lead.title, company: lead.company, domain: lead.domain,
      problem: lead.problem, scope: lead.scope, qualification: lead.status, selectedScenario: chosen,
      criteria: lead.criteria.map(x => ({ label: x.label, status: x.status, operatorReported: true })), approval: copy(lead.approval),
      readiness: { passed: state.passed, total: state.total, ready: state.ready, missing: state.missing },
      disclaimer: 'No real project, executed test, accepted delivery, customer contact or paid contract is represented.' };
  }
  return { fixtures, readiness, scenarioComparison, applyQualification, chooseScenario, setEvidence, approveInternal, exportPackage, escapeHtml, formatMoney };
});
