/* ===========================================================
   MST ERROR FLAGGING RULES (Namespaced)
   -----------------------------------------------------------
   This module defines reusable error/quality checks for MST rows.
   It is intentionally standalone so that new checks can be added
   or customised without touching the rest of the application.
   -----------------------------------------------------------
   Usage pattern (when you decide to integrate it):
   const flags = MST.ErrorFlags.evaluateAll(row);
   // flags will be an array of rule ids that matched
   =========================================================== */

window.MST = window.MST || {};

window.MST.ErrorFlags = (function() {
  const U = window.MST.Utils || {};

  // ----- Helpers ---------------------------------------------------------
  function toDate(value) {
    // Try utilities first (supports yyyymmdd strings)
    if (typeof U.yyyymmddToDate === "function") {
      const normalized = (value ?? "").toString();
      if (/^\d{8}$/.test(normalized)) {
        const parsed = U.yyyymmddToDate(normalized);
        if (parsed) return parsed;
      }
    }

    // Fallback to native Date parsing
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d) ? null : d;
  }

  // ----- Core rule registry ---------------------------------------------
  const rules = [
    {
      id: "FutureLSD",
      description: "Last Scheduled Date falls in the future.",
      evaluate(row) {
        const lastScheduled = toDate(row?.LastScheduledDate || row?.LSD);
        if (!lastScheduled) return false;
        const today = new Date();

        // Compare only on date part (ignoring timezones/time-of-day)
        const normalized = new Date(Date.UTC(
          lastScheduled.getUTCFullYear(),
          lastScheduled.getUTCMonth(),
          lastScheduled.getUTCDate()
        ));
        const todayNormalized = new Date(Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        ));

        return normalized > todayNormalized;
      }
    },
    {
      id: "0Units",
      description: "Units required is zero or missing.",
      evaluate(row) {
        const rawUnits = row?.UnitsRequired ?? row?.Units;
        if (rawUnits === null || rawUnits === undefined || rawUnits === "") return true;
        const numeric = Number(rawUnits);
        if (Number.isNaN(numeric)) return false;
        return numeric === 0;
      }
    }
  ];

  // ----- Public API ------------------------------------------------------
  function registerRule(rule) {
    if (!rule || !rule.id || typeof rule.evaluate !== "function") {
      throw new Error("Rule must have an id and an evaluate(row) function");
    }
    const alreadyExists = rules.some(r => r.id === rule.id);
    if (alreadyExists) {
      throw new Error(`Rule with id "${rule.id}" already exists`);
    }
    rules.push(rule);
  }

  function evaluateAll(row) {
    return rules
      .filter(rule => {
        try {
          return rule.evaluate(row);
        } catch (err) {
          console.warn(`Error evaluating rule ${rule.id}:`, err);
          return false;
        }
      })
      .map(rule => rule.id);
  }

  return {
    rules,
    registerRule,
    evaluateAll
  };
})();
