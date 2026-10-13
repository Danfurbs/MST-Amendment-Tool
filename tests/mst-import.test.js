const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../docs/libs/mst-editor-logic.js'), 'utf8').replace(/\r\n/g, '\n');
const events = new Map();
let scans = 0, renders = 0, sourceAdds = 0, singleAdds = 0;
const window = { MST: { Editor: {} }, MST_VARIABLES: { maxInstances: 5 }, originalProps: {} };
const E = window.MST.Editor;
window.calendar = {
  view: { activeStart: new Date(2026, 9, 1), activeEnd: new Date(2026, 10, 1) },
  batchRendering(fn) { fn(); },
  getEvents() { scans++; return [...events.values()]; },
  getEventById(id) { return events.get(id); },
  removeAllEventSources() { events.clear(); },
  removeAllEvents() { events.clear(); },
  addEventSource(source) {
    sourceAdds++;
    source.events.forEach(data => this.addEvent(data, true));
  },
  addEvent(data, batched = false) {
    if (!batched) singleAdds++;
    const event = { ...data, _def: { publicId: data.id }, remove() { events.delete(data.id); }, setProp(k, v) { this[k] = v; } };
    assert.ok(!events.has(data.id), 'no duplicate events');
    events.set(data.id, event); return event;
  }
};
const context = vm.createContext({ window, MST: window.MST, E, Date, console,
  document: { getElementById: () => null, addEventListener() {} }, structuredClone,
  clampDesc2: v => v.slice(0, 45), MAX_DESC2_LENGTH: 45,
  normalizeProtectionCode: v => v ? v.padStart(2, '0') : '',
  normalizeAllowMultipleFlag: v => v === 'YES' ? 'YES' : '',
  resolveStdJobUom: () => 'EA', normalizeTvExpiry: v => v || '', isActiveTv: v => Boolean(v),
  alert: message => { throw Error(message); }
});
vm.runInContext(fs.readFileSync(require.resolve('../docs/libs/mst-core-utils.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(require.resolve('../docs/libs/mst-advisory-ui.js'), 'utf8'), context);
context.U = window.MST.Utils;
function extract(begin, end) { return source.slice(source.indexOf(begin), source.indexOf(end, source.indexOf(begin))); }
vm.runInContext(extract('E.storeVirtualInstances =', '  /* ----------------------------------------\n     HIGHLIGHT SELECTED'), context);
vm.runInContext(extract('window.MST.Editor.ensureOriginalPropsStored =', '// Highlight a day'), context);
vm.runInContext(extract('  MST.Editor.loadMSTs =', '  /* ----------------------------------------\n     SAVE MST EDITS'), context);
const render = E.renderVisibleInstances;
E.renderVisibleInstances = (...args) => { renders++; return render(...args); };
const rows = Array.from({ length: 6000 }, (_, i) => ({
  CONCAT: 'M' + i, 'Last Scheduled Date': '2026-09-15', 'MST Frequency': 14,
  'MST Description 1': 'Inspect', 'MST Description 2': 'Track', 'Equipment Number': '00' + i,
  'Equipment Description 1': 'Asset ' + i, 'Std Job No': '123', 'Resource Hours': 2,
  'Protection Type Code': '1', 'Allow Multiple workorders': 'YES', 'Open Work Order Count': '2'
}));
E.loadMSTs(rows);
assert.equal(renders, 1, 'one full virtual-store render for 6000 MSTs');
assert.equal(scans, 1, 'one scan to capture mounted future-event references');
assert.equal(sourceAdds, 2, 'base and future events inserted as two batches');
assert.equal(singleAdds, 0, 'initial load never inserts calendar events individually');
assert.equal(events.size, 36000);
assert.equal(Object.keys(window.virtualInstanceStore).length, 6000);
assert.equal(events.get('M42_1').extendedProps.equipmentNo, '0042');
assert.equal(events.get('M42_1').extendedProps.resourceHours, 2);
assert.equal(events.get('M42_0').extendedProps.protType, '01');
assert.equal(events.get('M42_0').extendedProps.allowMultiple, 'YES');
assert.equal(events.get('M42_0').extendedProps.openWorkOrderCount, 2);
assert.equal(events.get('M42_1').extendedProps.openWorkOrderCount, 2);
assert.equal(events.get('M42_1').start.getHours(), 9);
assert.equal(window.originalProps.M42['MST Description 2'], 'Track');
assert.notEqual(window.originalProps.M42, rows[42], 'original snapshot remains independent');
assert.notEqual(window.loadedMstRows[42], rows[42]);

E.renderVisibleInstances(new Date(2027, 5, 1), new Date(2027, 6, 1));
assert.equal(events.size, 6000, 'offscreen future instances removed; base events retained');
E.renderVisibleInstances(window.calendar.view.activeStart, window.calendar.view.activeEnd);
assert.equal(events.size, 36000, 'navigation restores future instances');
assert.equal(events.get('M42_1').extendedProps.openWorkOrderCount, 2, 'navigation retains the work-order snapshot');
E.loadMSTs(rows.slice(0, 2));
assert.equal(events.size, 12, 'reload clears old dataset');
assert.equal(Object.keys(window.virtualInstanceStore).length, 2);
assert.equal(Object.keys(window.originalProps).length, 2);
E.rebuildFutureInstances('M0', new Date(2026, 8, 15), 28, 'Inspect', 'Track');
assert.equal(window.virtualInstanceStore.M0[0].frequency, 28);
assert.equal(events.get('M0_1').start.getDate(), 13);
assert.equal(events.get('M0_1').extendedProps.openWorkOrderCount, 2, 'frequency rebuilding retains the work-order snapshot');

let resolverCalls = 0;
window.MST.Views = { createEventDisplayResolver() {
  resolverCalls++;
  return event => event.extendedProps.mstId === 'M0' ? 'block' : 'none';
} };
E.loadMSTs(rows.slice(0, 2));
assert.equal(resolverCalls, 1, 'one filter snapshot for the import');
assert.equal(events.get('M0_1').display, 'block');
assert.equal(events.get('M1_1').display, 'none', 'batch insertion retains filter visibility');
E.renderVisibleInstances(new Date(2027, 5, 1), new Date(2027, 6, 1));
E.renderVisibleInstances(window.calendar.view.activeStart, window.calendar.view.activeEnd);
assert.equal(events.get('M1_1').display, 'none', 'navigation retains the active filter');

// Dropdown alias precedence and formatting must match the original loader.
const upload = fs.readFileSync(require.resolve('../docs/libs/FileUpload.js'), 'utf8');
const selects = new Map();
const doc = {
  getElementById(id) { if (!selects.has(id)) selects.set(id, { innerHTML: '', children: [], appendChild(fragment) { this.children.push(...fragment.children); } }); return selects.get(id); },
  createElement() { return {}; },
  createDocumentFragment() { return { children: [], appendChild(child) { this.children.push(child); } }; }
};
const populate = new Function('document', 'safeTrim', upload.slice(upload.indexOf('  function populateFilters'), upload.indexOf('  const fileInput')) + '; return populateFilters;')(doc, v => v == null ? '' : String(v).trim());
populate([
  { 'Standard Job Number': ' 20 ', 'Std Job No': 'IGNORED', 'Work Group Code': ' B ' },
  { 'Standard Job Number': '', 'Std Job No': '10', 'Work Group Code': 'A' },
  { 'Standard Job no': '30', 'Work Group Code': 'A' },
  { 'Standard Job no': '', 'Work Group Code': '' }
]);
assert.deepEqual(selects.get('filterStdJobNo').children.map(o => [o.value, o.textContent]), [['10', '10'], ['20', '20'], ['30', '30']]);
assert.deepEqual(selects.get('filterWorkGroup').children.map(o => o.value), ['A', 'B']);
assert.equal(selects.get('filterWorkGroup').innerHTML, '<option value="">(All)</option>');
console.log('6000-row import, navigation, snapshots, reload and filter parity passed');
