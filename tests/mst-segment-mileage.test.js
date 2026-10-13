const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const editor = fs.readFileSync(require.resolve('../docs/libs/mst-editor-logic.js'), 'utf8');
const upload = fs.readFileSync(require.resolve('../docs/libs/FileUpload.js'), 'utf8');
const helpers = editor.slice(editor.indexOf('const formatMileageValue ='), editor.indexOf('const bindDesc2Limiter ='));
const mileage = vm.runInNewContext(`${helpers}; ({formatMileageValue, normalizeMileageForComparison, normalizeMileageForTransfer})`);
for (const blank of [undefined, null, '', '   ']) {
  for (const normalize of Object.values(mileage)) assert.equal(normalize(blank), '');
}
for (const zero of [0, '0', '0.0000']) {
  assert.equal(mileage.formatMileageValue(zero), '0.0000');
  assert.equal(mileage.normalizeMileageForTransfer(zero), '0.0000');
  assert.equal(mileage.normalizeMileageForComparison(zero), '0');
}
assert.equal(mileage.normalizeMileageForTransfer('12.3456'), '12.3456');

const event = { extendedProps: {segFrom: '12', segTo: '34'}, title: 'Inspect', classNames: [],
  setExtendedProp(key, value) { this.extendedProps[key] = value; },
  setProp(key, value) { this[key] = value; } };
let row;
const E = { buildChangeExportRow: () => row };
const window = { changes: {}, createdMSTs: {}, changeCount: {}, calendar: {getEventById: () => event},
  MST: { Editor: E, Utils: {showToast() {}} } };
const context = vm.createContext({window, MST: window.MST, E, document: {getElementById: () => null},
  deriveMstId() {}, parseIsoDateToLocal: () => null, hydrateCreatedMstFromSession() {} });
vm.runInContext(editor.slice(editor.indexOf('  MST.Editor.markMSTAsChanged ='), editor.indexOf('  MST.Editor.hasChanged =')), context);
for (const [before, after, changed] of [['', '', false], ['', '0', true], ['0', '', true], ['0', '0', false]]) {
  row = { Old_Desc2: '', New_Desc2: '', Old_Segment_From: before, New_Segment_From: after,
    Old_Segment_To: '', New_Segment_To: '' };
  E.markMSTAsChanged('TEST');
  assert.equal(Boolean(window.changes.TEST), changed, `${JSON.stringify(before)} → ${JSON.stringify(after)}`);
}

vm.runInContext(upload.slice(upload.indexOf('  function applySessionPayload('), upload.indexOf('  function handleSessionWorkbook(')), context);
// Resume uses the saved values, including explicit clears, while missing fields retain the download.
E.markMSTAsChanged = () => {};
context.payload = {changes: {TEST: {New_Segment_From: '', New_Segment_To: 0}}};
vm.runInContext('applySessionPayload(payload)', context);
assert.equal(event.extendedProps.segFrom, '');
assert.equal(event.extendedProps.segTo, 0);
context.payload = {changes: {TEST: {New_Segment_To: ''}}};
event.extendedProps.segFrom = '12';
vm.runInContext('applySessionPayload(payload)', context);
assert.equal(event.extendedProps.segFrom, '12');
assert.equal(event.extendedProps.segTo, '');
console.log('Blank and zero segment mileage formatting, transfer, tracking and session resume passed');
