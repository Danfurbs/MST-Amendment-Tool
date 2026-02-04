/* ===========================================================
   MST CORE UTILITIES (Namespaced)
   =========================================================== */
window.MST = window.MST || {};

window.MST.Utils = {

  BASE_COLOR: "#10b981",      // Green for normal MSTs
  TV_COLOR: "#60a5fa",        // Blue for MSTs with TV reference
  FUTURE_COLOR: "#6b7280",    // Grey for future instances (darker for readability)

  yyyymmddToDate(str) {
    const normalized = (str ?? "").toString();
    if (!/^[0-9]{8}$/.test(normalized)) return null;
    const y = +normalized.slice(0, 4);
    const m = +normalized.slice(4, 6) - 1;
    const d = +normalized.slice(6, 8);
    const date = new Date(y, m, d, 12);   // noon avoids TZ rollover
    return isNaN(date) ? null : date;
  },

  dateToInputYYYYMMDD(dateObj) {
    if (!(dateObj instanceof Date) || isNaN(dateObj)) return "";
    return dateObj.toISOString().slice(0, 10);
  },

  addDays(base, n) {
    const d = new Date(base);
    d.setDate(d.getDate() + n);
    return d;
  },

  normalizeEquip(value) {
    return (value || "").toString().toUpperCase().replace(/^0+/, "");
  },

  normalizeDateInput(value) {
    if (value instanceof Date && !isNaN(value)) {
      return value.toISOString().slice(0, 10); // yyyy-mm-dd
    }

    const excelSerialToIso = (num) => {
      if (Number.isNaN(num)) return "";
      if (num < 30000 || num > 80000) return ""; // sanity range for Excel serial dates
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const date = new Date(excelEpoch.getTime() + num * 86400000);
      return isNaN(date) ? "" : date.toISOString().slice(0, 10);
    };

    if (typeof value === "number") {
      const iso = excelSerialToIso(value);
      if (iso) return iso;
      return value.toString().trim();
    }

    const str = (value ?? "").toString().trim();
    if (!str) return "";

    const numeric = Number(str);
    if (!Number.isNaN(numeric)) {
      const iso = excelSerialToIso(numeric);
      if (iso) return iso;
    }

    // Already yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

    // yyyymmdd → yyyy-mm-dd
    if (/^\d{8}$/.test(str)) {
      const d = window.MST.Utils.yyyymmddToDate(str);
      return d ? d.toISOString().slice(0, 10) : str;
    }

    // dd/mm/yyyy → yyyy-mm-dd
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [dd, mm, yyyy] = str.split("/");
      const d = new Date(+yyyy, +mm - 1, +dd);
      return isNaN(d) ? str : d.toISOString().slice(0, 10);
    }

    return str;
  },

  normalizeNumericField(value) {
    if (value === null || value === undefined) return "";
    const str = value.toString().trim();
    if (!str) return "";

    const num = Number(str.replace(/,/g, ""));
    return Number.isNaN(num) ? str : num.toString();
  },

  formatDateDMY(value) {
    const U = window.MST.Utils;
    if (!value) return "";

    // Already dd/mm/yyyy
    if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      return value;
    }

    // yyyy-mm-dd
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    }

    // yyyymmdd
    if (typeof value === "string" && /^\d{8}$/.test(value)) {
      const dObj = U.yyyymmddToDate(value);
      if (dObj) {
        const dd = String(dObj.getDate()).padStart(2, "0");
        const mm = String(dObj.getMonth() + 1).padStart(2, "0");
        const yy = dObj.getFullYear();
        return `${dd}/${mm}/${yy}`;
      }
    }

    // Excel Serial
    if (!isNaN(value)) {
      const n = Number(value);
      if (n > 30000 && n < 80000) {
        const date = new Date((n - 25569) * 86400 * 1000);
        const dd = String(date.getUTCDate()).padStart(2, "0");
        const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
        const yy = date.getUTCFullYear();
        return `${dd}/${mm}/${yy}`;
      }
    }

    // JS Date
    if (value instanceof Date && !isNaN(value)) {
      const dd = String(value.getDate()).padStart(2, "0");
      const mm = String(value.getMonth() + 1).padStart(2, "0");
      const yy = value.getFullYear();
      return `${dd}/${mm}/${yy}`;
    }

    return value;
  },

  formatDateForExport(dateObj) {
    if (!dateObj || isNaN(dateObj)) return "";
    const d = String(dateObj.getDate()).padStart(2, "0");
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
  }
};

(function() {
    const U = MST.Utils || {};
    MST.Utils = U;

    U.populateSelectWithUnique = function(selectEl, rows, columnKey, formatter = (v)=>v) {
        if (!selectEl) return;
        selectEl.innerHTML = '<option value="">(All)</option>';

        const uniq = new Set();

        rows.forEach(r => {
            const raw = (r[columnKey] ?? '').toString().trim();
            if (!raw) return;
            uniq.add(raw);
        });

        [...uniq].sort().forEach(v => {
            const opt = document.createElement("option");
            opt.value = v;
            opt.textContent = formatter(v);
            selectEl.appendChild(opt);
        });
    };

})();
