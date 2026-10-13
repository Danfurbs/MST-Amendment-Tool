const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Rules = require('../docs/libs/mst-advisory-rules.js');
class Element {
  constructor(tag) {
    this.tag = tag; this.children = []; this.controls = new Map(); this.events = {}; this.clientWidth = 400;
    const classes = new Set();
    this.classList = { toggle: (key, enabled) => enabled ? classes.add(key) : classes.delete(key), contains: key => classes.has(key) };
    this.dataset = {}; this.value = '';
  }
  appendChild(el) { this.children.push(el); }
  replaceChildren(...els) { this.children = els; }
  querySelector(key) { if (!this.controls.has(key)) this.controls.set(key, new Element(key)); return this.controls.get(key); }
  addEventListener(key, fn) { this.events[key] = fn; }
  setAttribute() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.events.close?.(); }
  remove() {}
  focus() {}
}
const elements = new Map(), dialogs = [];
const document = { getElementById(id) { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); },
  createElement(tag) { const el = new Element(tag); if (tag === 'dialog') dialogs.push(el); return el; },
  createElementNS: (_, tag) => new Element(tag), addEventListener() {}, body: new Element('body') };
const events = Object.fromEntries(['A', 'B'].map(mstId => [`${mstId}_0`, {
  start: new Date('2026-10-09T09:00:00Z'), extendedProps: { mstId, frequency: 30, jobDescCode: 'R1' }
}]));
const window = { MST: { AdvisoryRules: Rules, Editor: {}, Utils: {
  dateToInputYYYYMMDD: date => date.toISOString().slice(0, 10), normalizeDateInput: value => value,
  showToast() {}, formatMstToastSubject: () => ''
} }, calendar: { getEventById: id => events[id] }, originalProps: {
  A: { 'Open Work Order Count': '2', 'Download Date': '09/10/2026', 'Last Performed Date': '2026-10-09' },
  B: { 'Open Work Order Count': 3, 'Last Performed Date': '2026-10-09' }
}, MST_VARIABLES: { jobDescCodes: [{ code: 'R1', tol: 1 }] }, matchMedia: () => ({ matches: true }) };
for (const id of ['lastDateInput','freqInput','jobDescCodeInput','mileageFromInput','mileageToInput','desc2Input','wgInput','unitsRequiredInput','protTypeInput','protMethodInput','allowMultipleInput']) window[id] = document.getElementById(id);
window.lastDateInput.value = '2026-10-09'; window.freqInput.value = '30'; window.jobDescCodeInput.value = 'R1';
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-09T12:00:00Z'])); } }
const applied = [];
const context = vm.createContext({ window, MST: window.MST, document, Date: FixedDate, Intl,
  setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  applyMstUpdates(id, updates) { applied.push({ id, updates }); return { formattedSegFrom: '', formattedSegTo: '', baseEvent: events[`${id}_0`] }; }
});
vm.runInContext(fs.readFileSync(require.resolve('../docs/libs/mst-advisory-ui.js'), 'utf8'), context);
const editor = fs.readFileSync(require.resolve('../docs/libs/mst-editor-logic.js'), 'utf8').replace(/\r\n/g, '\n');
const start = editor.indexOf('  MST.Editor.saveMSTEdits = async function');
vm.runInContext(editor.slice(start, editor.indexOf('\n  };', start) + 6), context);
const { WorkOrders: WO, Advisory: UI } = window.MST;
function checkbox(dialog) { return dialog.querySelector('.mst-advisory-copy').children.find(el => el.className === 'mst-work-order-ack').children[0]; }
function acknowledge(dialog) { const box = checkbox(dialog); box.checked = true; box.events.change(); dialog.querySelector('[data-proceed]').onclick(); }
const proposal = { after: { lastScheduled: '2026-10-10' } };
(async () => {
  for (const [value, expected] of [[0,0], [' 2 ',2], [3,3], ['',null], [null,null], [undefined,null], [-1,null], ['bad',null], [1.5,null], [true,null], [Infinity,null]]) assert.equal(WO.parseCount(value), expected);
  assert.equal(UI.check('A').needsWorkOrderConfirmation, false);
  assert.equal(UI.check('A', proposal).needsWorkOrderConfirmation, true);
  assert.equal(UI.check('A', { after: { frequency: '30' } }).needsWorkOrderConfirmation, false);
  assert.equal(UI.check('A', { after: { frequency: 28 } }).needsWorkOrderConfirmation, true);
  assert.equal(UI.check('A', { after: { jobCode: 'OTHER' } }).needsWorkOrderConfirmation, false);
  WO.refresh('A');
  assert.equal(elements.get('sidebar').classList.contains('has-open-work-orders'), true);
  assert.ok(elements.get('mstWorkOrderStatus').children.some(el => el.textContent.includes('09/10/2026')));
  for (const count of [0, null, '', 'invalid']) {
    window.originalProps.A['Open Work Order Count'] = count;
    assert.equal(await UI.confirmChange('A', proposal), true);
    WO.refresh('A'); assert.equal(elements.get('sidebar').classList.contains('has-open-work-orders'), false);
  }
  window.originalProps.A['Open Work Order Count'] = 2;
  events.A_0.extendedProps.isNew = true;
  assert.equal(WO.count('A'), null, 'new MST never inherits snapshot count');
  delete events.A_0.extendedProps.isNew;
  let pending = UI.confirmChange('A', proposal), dialog = dialogs.at(-1);
  assert.equal(dialog.querySelector('[data-proceed]').disabled, true);
  dialog.querySelector('[data-proceed]').onclick(); assert.equal(dialog.open, true, 'unchecked programmatic proceed is rejected');
  assert.equal(await UI.confirmChange('A', proposal), false, 'no overlapping confirmations');
  dialog.events.cancel({ preventDefault() {} }); assert.equal(await pending, false);
  pending = UI.confirmChange('A', proposal); acknowledge(dialogs.at(-1)); assert.equal(await pending, true);
  pending = UI.confirmChange('A', proposal); dialog = dialogs.at(-1);
  assert.equal(checkbox(dialog).checked, false, 'every amendment starts unchecked');
  dialog.querySelector('[data-cancel]').onclick(); assert.equal(await pending, false);
  const batch = ['A','B'].map(mstId => ({ mstId, updates: { lastDate: '2026-10-10', frequency: 30, jobDescCode: 'R1' } }));
  pending = UI.confirmBulk(batch); dialog = dialogs.at(-1);
  const sections = dialog.querySelector('.mst-advisory-copy').children.filter(el => el.tag === 'section');
  assert.deepEqual(sections.map(el => el.children[0].textContent), ['A: Open work orders: 2 — at download.', 'B: Open work orders: 3 — at download.']);
  dialog.querySelector('[data-cancel]').onclick(); assert.equal(await pending, false);
  pending = UI.confirmBulk(batch); acknowledge(dialogs.at(-1)); assert.equal(await pending, true);
  window.freqInput.value = '28';
  pending = window.MST.Editor.saveMSTEdits('A');
  await window.MST.Editor.saveMSTEdits('A'); assert.equal(applied.length, 0);
  window.freqInput.value = '99'; acknowledge(dialogs.at(-1)); await pending;
  assert.equal(applied.length, 1); assert.equal(applied[0].updates.frequency, '28', 'apply reviewed snapshot, not changed editor values');
  pending = window.MST.Editor.saveMSTEdits('A'); dialogs.at(-1).querySelector('[data-cancel]').onclick(); await pending;
  assert.equal(applied.length, 1); assert.equal(window.freqInput.value, '99', 'cancellation preserves draft');
  assert.equal(WO.count('A'), 2, 'acknowledgement never clears snapshot warning');
  // Exercise the actual bulk action: no row mutates until the shared review is accepted.
  const views = fs.readFileSync(require.resolve('../docs/libs/MST-views.js'), 'utf8').replace(/\r\n/g, '\n');
  context.pendingChanges = batch;
  context.previewApplyBtn = new Element('button');
  context.closePreview = context.closeEditor = context.openOverlay = () => {};
  const bulkApplied = [];
  window.MST.Editor.applyBulkEdits = (id, updates) => { bulkApplied.push({ id, updates }); return true; };
  vm.runInContext(views.slice(views.indexOf('    let bulkApplyPending = false;'), views.indexOf('    // Preview modal event listeners')), context);
  pending = vm.runInContext('applyBulkUpdates()', context);
  await vm.runInContext('applyBulkUpdates()', context);
  assert.equal(bulkApplied.length, 0);
  dialogs.at(-1).querySelector('[data-cancel]').onclick(); await pending;
  assert.equal(bulkApplied.length, 0, 'bulk cancellation leaves every row untouched');
  assert.equal(context.previewApplyBtn.disabled, false);
  pending = vm.runInContext('applyBulkUpdates()', context);
  batch[0].updates.frequency = 99;
  acknowledge(dialogs.at(-1)); await pending;
  assert.equal(bulkApplied.length, 2);
  assert.equal(bulkApplied[0].updates.frequency, 30, 'bulk applies only reviewed values');
  assert.match(WO.deactivationMessage('A'), /2 open work order/);
  assert.match(WO.deactivationMessage('A'), /remain active even against a deactivated MST/);
  assert.match(WO.deactivationMessage('A'), /closed, or cancelled if the work is not complete/);
  assert.match(WO.deactivationMessage('A'), /weekly snapshot may be out of date/);
  window.originalProps.B['Open Work Order Count'] = 0;
  assert.equal(WO.deactivationMessage('B'), 'Deactivate this MST?');
  delete window.originalProps.B['Open Work Order Count'];
  assert.equal(WO.deactivationMessage('B'), 'Deactivate this MST?');
  // Run the real deactivation entry point up to its existing ABP/mutation logic.
  const deactivateStart = editor.indexOf('  MST.Editor.deactivateMST = function');
  const deactivateEnd = editor.indexOf('    const orig = window.originalProps[mstId] || {};', deactivateStart);
  let confirmation, accepted = false;
  context.confirm = text => { confirmation = text; return accepted; };
  vm.runInContext(editor.slice(deactivateStart, deactivateEnd) + 'return "ready-to-deactivate"; };', context);
  assert.equal(window.MST.Editor.deactivateMST('A'), undefined, 'Cancel stops before all deactivation mutations');
  assert.equal(confirmation, WO.deactivationMessage('A'));
  accepted = true;
  assert.equal(window.MST.Editor.deactivateMST('A'), 'ready-to-deactivate', 'acknowledgement allows existing deactivation flow');
  const savedUtils = window.MST.Utils;
  vm.runInContext(fs.readFileSync(require.resolve('../docs/libs/mst-core-utils.js'), 'utf8'), context);
  window.originalProps.A['Download Date'] = 46304;
  WO.refresh('A');
  assert.ok(elements.get('mstWorkOrderStatus').children.some(el => el.textContent === 'Download date: 09/10/2026'), 'Excel serial dates are formatted for planners');
  window.MST.Utils = savedUtils;
  WO.refresh(null); assert.equal(elements.get('mstWorkOrderStatus').hidden, true);
  console.log('Work-order parsing, snapshot warnings, checkbox enforcement, repeated/bulk confirmations and immutable editor saves passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
