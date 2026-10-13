const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Rules = require('../docs/libs/mst-advisory-rules.js');
const editor = fs.readFileSync(require.resolve('../docs/libs/mst-editor-logic.js'), 'utf8').replace(/\r\n/g, '\n');
class Element {
  constructor() { this.events = {}; this.children = []; this.controls = new Map(); this.clientWidth = 500; this.classList = { add() {}, remove() {} }; }
  addEventListener(name, fn) { this.events[name] = fn; }
  removeEventListener(name, fn) { if (this.events[name] === fn) delete this.events[name]; }
  setAttribute() {}
  appendChild(el) { this.children.push(el); }
  replaceChildren(...els) { this.children = els; }
  querySelector(key) { if (!this.controls.has(key)) this.controls.set(key, new Element()); return this.controls.get(key); }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; this.events.close?.(); }
  remove() {}
}
const elements = new Map(), dialogs = [];
const document = Object.assign(new Element(), {
  getElementById(id) { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); },
  createElement(tag) { const el = new Element(); if (tag === 'dialog') dialogs.push(el); return el; },
  createElementNS() { return new Element(); }, body: new Element()
});
class FixedDate extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-07T12:00:00Z'])); } }
const base = { start: new FixedDate('2026-10-01T09:00:00'), extendedProps: { mstId: 'M1', instance: 0, frequency: 14, jobDescCode: 'R1' } };
const window = {
  MST: { AdvisoryRules: Rules, Utils: { dateToInputYYYYMMDD: d => d.toISOString().slice(0, 10), normalizeDateInput: v => v } },
  calendar: { getEventById: () => base },
  MST_VARIABLES: { jobDescCodes: [{ code: 'R1', tol: 1 }] },
  originalProps: { M1: { 'Last Performed Date': '2026-08-01', 'Scheduling Indicator Code': '1' } },
  // Deliberately unrelated unsaved editor values.
  lastDateInput: { value: '2020-01-01' }, freqInput: { value: '1' }, jobDescCodeInput: { value: 'UNKNOWN' },
  matchMedia: () => ({ matches: true })
};
let applied = 0, reverted = 0;
const context = vm.createContext({ window, document, MST: window.MST, U: window.MST.Utils, Date: FixedDate, Intl,
  console, alert: message => { throw new Error(message); }, setTimeout: () => 1, clearTimeout() {},
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  applyEventDrop() { applied++; }
});
vm.runInContext('let pendingCalendarDrop = false;', context);
vm.runInContext(editor.slice(editor.indexOf('const normalizeDragDate ='), editor.indexOf('const showDragPreview =')), context);
vm.runInContext(fs.readFileSync(require.resolve('../docs/libs/mst-advisory-ui.js'), 'utf8'), context);
const begin = editor.indexOf('    eventDrop(info) {'), end = editor.indexOf('\n  });', begin);
const handler = vm.runInContext('({' + editor.slice(begin, end) + '})', context).eventDrop;
const flush = () => new Promise(resolve => setImmediate(resolve));
function drop(instance, date, oldBase = '2026-10-01') {
  base.start = new FixedDate(oldBase + 'T09:00:00');
  const oldStart = new FixedDate(base.start); oldStart.setDate(oldStart.getDate() + instance * 14);
  const moved = new FixedDate(date + 'T09:00:00');
  if (instance === 0) base.start = moved; // FullCalendar's provisional mutation.
  const info = {
    event: { start: moved, extendedProps: { ...base.extendedProps, instance } },
    oldEvent: { start: oldStart, extendedProps: { ...base.extendedProps, instance } },
    revert() { reverted++; base.start = new FixedDate(oldBase + 'T09:00:00'); }
  };
  handler(info); return info;
}
const click = id => elements.get(id).events.click?.();
(async () => {
  drop(0, '2026-09-01');
  assert.equal(dialogs.length, 0, 'ordinary confirmation comes first');
  const confirm = elements.get('dragConfirmOk').events.click;
  confirm(); confirm();
  assert.equal(dialogs.length, 1, 'double click opens only one advisory');
  assert.equal(applied, 0);
  const info = { revert() { reverted++; } }; handler(info);
  assert.equal(reverted, 1, 'overlapping drag rejected');
  dialogs.at(-1).querySelector('[data-proceed]').onclick(); await flush();
  assert.equal(applied, 1, 'accepted drag commits once');

  drop(1, '2026-09-20'); click('dragConfirmOk');
  dialogs.at(-1).querySelector('[data-after]').onclick();
  const timeline = dialogs.at(-1).querySelector('.mst-advisory-timeline').children[0];
  assert.ok(timeline.children.some(el => String(el.textContent).includes('06/09/2026')), 'future drop assesses the effective base date');
  const result = window.MST.Advisory.check('M1', { before: { lastScheduled: '2026-10-01' }, after: { lastScheduled: '2026-09-06' } });
  assert.equal(result.after.frequency, 14, 'editor draft ignored');
  assert.equal(result.after.lpd, result.before.lpd, 'completion unchanged');
  assert.ok(result.worsened.includes('backlog'));
  assert.ok(!result.worsened.includes('nonCompliance'));
  dialogs.at(-1).events.cancel({ preventDefault() {} }); await flush();
  assert.equal(applied, 1); assert.equal(reverted, 2, 'Escape in advisory reverts future-instance drag');

  drop(0, '2026-09-01'); click('dragConfirmCancel'); await flush();
  assert.equal(reverted, 3);
  drop(0, '2026-09-01'); document.events.keydown({ key: 'Escape', preventDefault() {} }); await flush();
  assert.equal(reverted, 4, 'Escape in date confirmation reverts');

  let count = dialogs.length;
  drop(0, '2026-10-02'); click('dragConfirmOk'); await flush();
  assert.equal(dialogs.length, count, 'unchanged compliance alone does not open popup');
  drop(0, '2026-09-10', '2026-09-01'); click('dragConfirmOk'); await flush();
  assert.equal(dialogs.length, count, 'improving backlog does not open popup');

  window.originalProps.M1['Scheduling Indicator Code'] = '2';
  drop(0, '2026-09-01'); click('dragConfirmOk'); await flush();
  assert.equal(dialogs.length, count, 'unsupported schedule does not claim new backlog');
  window.originalProps.M1['Scheduling Indicator Code'] = '1';
  drop(0, '2026-09-01', '2026-09-10'); click('dragConfirmOk');
  assert.equal(dialogs.length, count + 1, 'worsening existing backlog opens popup');
  dialogs.at(-1).querySelector('[data-cancel]').onclick(); await flush();
  assert.equal(applied, 4);
  assert.equal(document.events.keydown, undefined, 'date confirmation listeners removed');
  window.originalProps.M1['Open Work Order Count'] = 2;
  for (const instance of [0, 1]) {
    count = dialogs.length;
    const committedBefore = applied, revertedBefore = reverted;
    drop(instance, instance ? '2026-10-16' : '2026-10-02'); click('dragConfirmOk');
    assert.equal(dialogs.length, count + 1, 'work orders require review even when scheduling risk does not worsen');
    let dialog = dialogs.at(-1);
    assert.equal(dialog.querySelector('[data-proceed]').disabled, true);
    dialog.querySelector('[data-proceed]').onclick(); await flush();
    assert.equal(applied, committedBefore, 'cannot bypass unchecked work-order acknowledgement');
    dialog.events.cancel({ preventDefault() {} }); await flush();
    assert.equal(reverted, revertedBefore + 1);
    drop(instance, instance ? '2026-10-16' : '2026-10-02'); click('dragConfirmOk');
    dialog = dialogs.at(-1);
    const checkbox = dialog.querySelector('.mst-advisory-copy').children.find(el => el.className === 'mst-work-order-ack').children[0];
    checkbox.checked = true; checkbox.events.change();
    dialog.querySelector('[data-proceed]').onclick(); await flush();
    assert.equal(applied, committedBefore + 1);
  }
  console.log('Drag advisory confirmation, snapshots, cancellation and concurrency passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
