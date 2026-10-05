const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const editorSource = fs.readFileSync(path.join(__dirname, "../docs/libs/mst-editor-logic.js"), "utf8");
const uploadSource = fs.readFileSync(path.join(__dirname, "../docs/libs/FileUpload.js"), "utf8");
const events = new Map();
const schedules = {};
const original = { id: "000017280490_9666_0", extendedProps: { mstId: "000017280490_9666", instance: 0 } };
events.set(original.id, original);
const windowMock = {
  calendar: {
    getEventById: id => events.get(id),
    addEvent(event) {
      assert.ok(!events.has(event.id), `Event ${event.id} must have a unique ID`);
      events.set(event.id, event);
      return event;
    }
  },
  createdMSTs: {},
  originalProps: {},
  MST: { Utils: { BASE_COLOR: "green", normalizeDateInput: value => value }, Editor: {} }
};
const Editor = windowMock.MST.Editor;
Editor.rebuildFutureInstances = (id, date, frequency, desc1, desc2) => {
  schedules[id] = { date, frequency, desc1, desc2 };
};
const context = vm.createContext({
  window: windowMock, MST: windowMock.MST, E: Editor, U: windowMock.MST.Utils,
  clampDesc2: value => value.slice(0, 45),
  normalizeProtectionCode: value => value,
  normalizeAllowMultipleFlag: value => value,
  calculateLastScheduledFromNext: (date, frequency) => {
    const last = new Date(date);
    if (Number.isNaN(last.getTime())) return "";
    last.setUTCDate(last.getUTCDate() - frequency);
    return last.toISOString().slice(0, 10);
  },
  isPastDate: value => value < "2026-10-05",
  safeTrim: value => String(value || "").trim(),
  parseIsoDateToLocal: value => value ? new Date(`${value}T09:00:00`) : null
});
const helperStart = editorSource.indexOf("MST.Editor.getAvailableNewMstId = function");
const helperEnd = editorSource.indexOf("/* ----------------------------------------\n   ADD NEW MST", helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart);
vm.runInContext(editorSource.slice(helperStart, helperEnd), context);

const input = {
  equipNo: "000017280490", stdJobNo: "9666", desc1: "Inspect", desc2: "First",
  jobDescCode: "1E", freq: "28", nextDateStr: "2026-11-10", unitsReq: "1",
  protType: "N", wgCode: "WG", stdJobUom: "SM"
};
assert.equal(Editor.buildNewMstPayload({ ...input, equipNo: "" }).ok, false, "mandatory fields remain required");
assert.equal(Editor.buildNewMstPayload({ ...input, nextDateStr: "2026-01-01" }).ok, false, "past dates remain invalid");

// Bulk creation validates all rows before adding any calendar events.
const firstPayload = Editor.buildNewMstPayload(input);
const secondPayload = Editor.buildNewMstPayload({ ...input, desc2: "Second", freq: "14" });
assert.equal(firstPayload.ok, true, "an existing equipment/SJN must not block creation");
assert.equal(secondPayload.ok, true);
assert.equal(firstPayload.data.mstId, secondPayload.data.mstId);
const first = Editor.createMstFromPayload(firstPayload.data);
const second = Editor.createMstFromPayload(secondPayload.data);
assert.equal(first.mstId, "000017280490_9666__1");
assert.equal(second.mstId, "000017280490_9666__2");
assert.equal(events.get(original.id), original, "existing MST must remain untouched");
assert.equal(schedules[first.mstId].frequency, 28);
assert.equal(schedules[second.mstId].frequency, 14);
assert.equal(Object.keys(windowMock.createdMSTs).length, 2, "both new MSTs must be retained for export");
const exported = Object.values(windowMock.createdMSTs);
assert.equal(exported[0]["Equipment"], input.equipNo);
assert.equal(exported[1]["Equipment"], input.equipNo);
assert.equal(exported[0]["Std Job No"], input.stdJobNo);
assert.equal(exported[1]["Std Job No"], input.stdJobNo);
assert.equal(exported[0]["MST Desc 2"], "First");
assert.equal(exported[1]["MST Desc 2"], "Second");

// Session export already stores created MSTs by ID. Restore those keys verbatim.
const saved = JSON.parse(JSON.stringify(windowMock.createdMSTs));
events.delete(`${first.mstId}_0`);
events.delete(`${second.mstId}_0`);
const hydrateStart = uploadSource.indexOf("  function hydrateCreatedMstFromSession(");
const hydrateEnd = uploadSource.indexOf("\n  function applySessionPayload", hydrateStart);
assert.ok(hydrateStart >= 0 && hydrateEnd > hydrateStart);
vm.runInContext(uploadSource.slice(hydrateStart, hydrateEnd), context);
context.saved = saved;
vm.runInContext("hydrateCreatedMstFromSession(saved)", context);
assert.equal(events.size, 3, "reopening must restore both MSTs alongside the original");
assert.equal(events.get(`${first.mstId}_0`).extendedProps.desc2, "First");
assert.equal(events.get(`${second.mstId}_0`).extendedProps.desc2, "Second");
assert.equal(events.get(`${second.mstId}_0`).extendedProps.frequency, 14);
vm.runInContext("hydrateCreatedMstFromSession(saved)", context);
assert.equal(events.size, 3, "reapplying the same batch must not duplicate its rows");

events.delete(`${first.mstId}_0`);
assert.equal(Editor.getAvailableNewMstId(input.equipNo, input.stdJobNo), "000017280490_9666__3", "saved rows reserve their IDs even without mounted events");
assert.equal(Editor.getAvailableNewMstId("OTHER", input.stdJobNo), "OTHER_9666", "unused pairs keep the original ID format");

console.log("duplicate SJN creation and batch resume regressions passed");
