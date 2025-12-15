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

  function toTrimmed(value) {
    return (value ?? "").toString().trim();
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
      id: "ExpiredTv",
      description: "TV expiry date has passed.",
      evaluate(row) {
        const tvRef =
          toTrimmed(row?.tvReference) ||
          toTrimmed(row?.TVReference) ||
          toTrimmed(row?.TV_Reference) ||
          toTrimmed(row?.TVReferenceNumber) ||
          toTrimmed(row?.TVReferenceNo) ||
          toTrimmed(row?.TempVarReferenceNumber) ||
          toTrimmed(row?.["Temp Var Reference Number"]) ||
          toTrimmed(row?.["TV Reference"]);

        if (!tvRef || tvRef.toUpperCase() === "NULL") return false;

        const rawExpiry =
          toTrimmed(row?.tvExpiryNormalized) ||
          toTrimmed(row?.TVExpiryDate) ||
          toTrimmed(row?.TV_Expiry_Date) ||
          toTrimmed(row?.["TV Expiry Date"]);

        if (!rawExpiry || rawExpiry === "2001-01-01") return false;

        const expiryDate = toDate(rawExpiry);
        if (!expiryDate) return false;

        const today = new Date();
        const normalizedExpiry = new Date(Date.UTC(
          expiryDate.getUTCFullYear(),
          expiryDate.getUTCMonth(),
          expiryDate.getUTCDate()
        ));
        const todayNormalized = new Date(Date.UTC(
          today.getUTCFullYear(),
          today.getUTCMonth(),
          today.getUTCDate()
        ));

        return normalizedExpiry < todayNormalized;
      }
    },
    {
      id: "ObsoleteAsset",
      description: "Asset Status Code indicates the asset is obsolete.",
      evaluate(row) {
        const statusCode =
          toTrimmed(row?.AssetStatusCode) ||
          toTrimmed(row?.["Asset Status Code"]) ||
          toTrimmed(row?.AssetStatus);

        if (statusCode === "") return false;

        return statusCode.toUpperCase() === "OR";
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
    },
    {
      id: "MissingProtectionMethod",
      description: "Protection Method code is blank.",
      evaluate(row) {
        const protMethod =
          toTrimmed(row?.ProtectionMethod) ||
          toTrimmed(row?.["Protection Method Code"]) ||
          toTrimmed(row?.ProtectionMethodCode);

        return protMethod === "";
      }
    },
    {
      id: "InvalidJobDescCode",
      description: "Job Description Code is missing or not in the latest list.",
      evaluate(row) {
        const jobDescCode =
          toTrimmed(row?.JobDescCode) ||
          toTrimmed(row?.["Job Description Code"]) ||
          toTrimmed(row?.JobDescriptionCode);

        const list = window.MST_VARIABLES?.jobDescCodes || [];
        const validCodes = new Set(
          Array.isArray(list)
            ? list
                .map(item => toTrimmed(item?.code))
                .filter(code => code !== "")
            : []
        );

        if (!validCodes.size) return false;

        return jobDescCode === "" || !validCodes.has(jobDescCode);
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
