const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../docs/libs/mst-editor-logic.js'), 'utf8');
const start = source.indexOf('  const applyMstUpdates =');
const end = source.indexOf('  MST.Editor.getAbpCommentaryRequirement =', start);
assert.ok(start >= 0 && end > start);
const alerts = [];
let mutations = 0;
const event = {
  extendedProps: { workGroup: 'WG12345', frequency: 28, desc1: 'Inspect' },
  start: new Date('2026-11-01'),
  setExtendedProp(key, value) { mutations++; this.extendedProps[key] = value; }
};
const Editor = { rebuildFutureInstances() {}, markMSTAsChanged() {} };
const windowMock = { calendar: { getEventById: () => event }, MST: { Editor } };
const context = vm.createContext({
  window: windowMock, MST: windowMock.MST, E: Editor,
  U: { normalizeDateInput: value => value },
  alert: message => alerts.push(message),
  clampDesc2: value => value, formatMileageValue: value => value,
  normalizeProtectionCode: value => value, normalizeAllowMultipleFlag: value => value,
  getAbpCommentaryRequirementForUpdate: () => ({ required: false }),
  triggerResourceChartRefresh() {}, refreshActiveCalendarFilters() {}
});
vm.runInContext(source.slice(start, end), context);
for (const workGroup of ['', 'WG1234', 'WG123456', '       ']) {
  assert.equal(Editor.applyBulkEdits('MST_1', { workGroup, frequency: 14 }), false);
  assert.equal(mutations, 0, 'invalid amendments must not mutate any fields');
  assert.equal(event.extendedProps.frequency, 28);
  assert.match(alerts.at(-1), /exactly 7 characters/);
}
assert.equal(Editor.applyBulkEdits('MST_1', { workGroup: ' WG54321 ' }), true);
assert.equal(event.extendedProps.workGroup, 'WG54321');
event.extendedProps.workGroup = 'SHORT';
const previousMutations = mutations;
assert.equal(Editor.applyBulkEdits('MST_1', { frequency: 14 }), false, 'validate the effective workgroup when omitted');
assert.equal(mutations, previousMutations);
console.log('workgroup amendment validation passed');
