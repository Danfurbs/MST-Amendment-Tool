/* ===========================================================
   MST CORE UTILITIES (Namespaced)
   =========================================================== */
window.MST = window.MST || {};

window.MST.Utils = {

  BASE_COLOR: "#10b981",

  yyyymmddToDate(str) {
    if (!/^[0-9]{8}$/.test(str || "")) return null;
    const y = +str.slice(0, 4);
    const m = +str.slice(4, 6) - 1;
    const d = +str.slice(6, 8);
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
