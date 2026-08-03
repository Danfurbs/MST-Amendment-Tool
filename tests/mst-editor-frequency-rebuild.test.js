const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const editorPath = path.join(__dirname, "..", "docs", "libs", "mst-editor-logic.js");
const source = fs.readFileSync(editorPath, "utf8");
const functionStart = source.indexOf("E.rebuildFutureInstances = function");
const functionEnd = source.indexOf("\n};", functionStart) + 3;

assert.notEqual(functionStart, -1, "rebuildFutureInstances should exist");
assert.ok(functionEnd > 2, "rebuildFutureInstances should have a closing statement");

const removed = [];
const previousInstance = {
  _def: { publicId: "MST_42_1" },
  extendedProps: { mstId: "MST_42", instance: 1 },
  remove() {
    removed.push(this._def.publicId);
  }
};
const baseEvent = {
  extendedProps: {
    mstId: "MST_42",
    instance: 0,
    frequency: 14,
    desc1: "Inspect"
  }
};
const windowMock = {
  calendar: {
    view: {
      activeStart: new Date("2026-08-01"),
      activeEnd: new Date("2026-09-01")
    },
    getEvents: () => [baseEvent, previousInstance],
    getEventById: (id) => (id === "MST_42_0" ? baseEvent : null)
  },
  // Reproduce the failure: the compatibility map has lost the mounted event,
  // while the lazy-loading ID set still claims old instances are rendered.
  futureEventsMap: { MST_42: [] },
  virtualInstanceStore: {},
  renderedInstanceIds: new Set(["MST_42_1", "MST_42_2", "OTHER_1"])
};
const Editor = {
  storeVirtualInstances(mstId, baseDate, frequency) {
    windowMock.virtualInstanceStore[mstId] = [{ id: `${mstId}_1`, frequency }];
  },
  renderVisibleInstances() {
    windowMock.virtualInstanceStore.MST_42.forEach((instance) => {
      if (!windowMock.renderedInstanceIds.has(instance.id)) {
        windowMock.renderedInstanceIds.add(instance.id);
      }
    });
  }
};

new Function("E", "window", "U", source.slice(functionStart, functionEnd))(
  Editor,
  windowMock,
  {}
);

Editor.rebuildFutureInstances("MST_42", new Date("2026-08-01"), 7, "Inspect", "Asset");

assert.deepEqual(removed, ["MST_42_1"], "the old mounted instance should be removed");
assert.ok(windowMock.renderedInstanceIds.has("MST_42_1"), "the amended schedule should render");
assert.ok(!windowMock.renderedInstanceIds.has("MST_42_2"), "unmounted stale IDs should be cleared");
assert.ok(windowMock.renderedInstanceIds.has("OTHER_1"), "other MST schedules should be untouched");
assert.equal(windowMock.virtualInstanceStore.MST_42[0].frequency, 7, "the new frequency should be stored");

console.log("frequency rebuild regression passed");
