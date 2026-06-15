/* ===========================================================
   MST CORE UTILITIES (Namespaced)
   =========================================================== */
window.MST = window.MST || {};

window.MST.Utils = {

  BASE_COLOR: "#10b981",      // Green for normal MSTs
  TV_COLOR: "#60a5fa",        // Blue for MSTs with TV reference
  FUTURE_COLOR: "#a78bfa",    // Light purple for future instances

  datePartsToDate(year, month, day, hour = 12) {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null;
    if (y < 1900 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;

    const date = new Date(y, m - 1, d, hour); // noon avoids TZ rollover unless caller requests another hour
    if (isNaN(date)) return null;
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
    return date;
  },

  yyyymmddToDate(str) {
    const normalized = (str ?? "").toString().trim();
    if (!/^[0-9]{8}$/.test(normalized)) return null;
    return window.MST.Utils.datePartsToDate(
      normalized.slice(0, 4),
      normalized.slice(4, 6),
      normalized.slice(6, 8)
    );
  },

  ddmmyyyyToDate(str) {
    const normalized = (str ?? "").toString().trim();
    const match = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!match) return null;
    return window.MST.Utils.datePartsToDate(match[3], match[2], match[1]);
  },

  isoDateToDate(str) {
    const normalized = (str ?? "").toString().trim();
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return window.MST.Utils.datePartsToDate(match[1], match[2], match[3]);
  },

  excelSerialToDate(num) {
    const serial = Number(num);
    if (!Number.isFinite(serial) || serial < 30000 || serial > 80000) return null;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    if (isNaN(date)) return null;
    return window.MST.Utils.datePartsToDate(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate()
    );
  },

  parseDate(value) {
    const U = window.MST.Utils;
    if (value instanceof Date && !isNaN(value)) {
      return U.datePartsToDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    if (typeof value === "number") {
      return U.excelSerialToDate(value);
    }

    const str = (value ?? "").toString().trim();
    if (!str) return null;

    if (/^\d+(\.\d+)?$/.test(str)) {
      const excelDate = U.excelSerialToDate(Number(str));
      if (excelDate) return excelDate;
    }

    if (/^\d{8}$/.test(str)) return U.yyyymmddToDate(str);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return U.isoDateToDate(str);
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) return U.ddmmyyyyToDate(str);

    const parsed = new Date(str);
    if (isNaN(parsed)) return null;
    return U.datePartsToDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  },

  dateToInputYYYYMMDD(dateObj) {
    const date = window.MST.Utils.parseDate(dateObj);
    if (!date) return "";
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },

  addDays(dateObj, days) {
    const date = window.MST.Utils.parseDate(dateObj);
    const offset = Number(days);
    if (!date || !Number.isFinite(offset)) return null;

    const result = new Date(date);
    result.setDate(result.getDate() + offset);
    return result;
  },

  normalizeEquip(value) {
    return (value || "").toString().toUpperCase().replace(/^0+/, "");
  },

  normalizeDateInput(value) {
    const date = window.MST.Utils.parseDate(value);
    return date ? window.MST.Utils.dateToInputYYYYMMDD(date) : "";
  },

  normalizeNumericField(value) {
    if (value === null || value === undefined) return "";
    const str = value.toString().trim();
    if (!str) return "";

    const num = Number(str.replace(/,/g, ""));
    return Number.isNaN(num) ? str : num.toString();
  },

  formatDateDMY(value) {
    const date = window.MST.Utils.parseDate(value);
    if (!date) return value || "";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yy = date.getFullYear();
    return `${dd}/${mm}/${yy}`;
  },

  formatDateForExport(dateObj) {
    return window.MST.Utils.formatDateDMY(dateObj);
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

    U.formatMstToastSubject = function(source = {}) {
        const props = source?.extendedProps || source || {};
        const desc1 = (
            props.desc1 ||
            props["MST Description 1"] ||
            props["MST Desc 1"] ||
            ""
        ).toString().trim();
        const desc2 = (
            props.desc2 ||
            props["MST Description 2"] ||
            props["MST Desc 2"] ||
            ""
        ).toString().trim();
        const equipmentNo = (
            props.equipmentNo ||
            props["Equipment Number"] ||
            props.Equipment ||
            ""
        ).toString().trim();
        const equipmentMeta = equipmentNo && window.equipmentDescriptions instanceof Map
            ? window.equipmentDescriptions.get(equipmentNo)
            : null;
        const assetDesc1 = (
            props.equipmentDesc1 ||
            props["Equipment Description 1"] ||
            equipmentMeta?.desc1 ||
            ""
        ).toString().trim();

        const mstDescription = [desc1, desc2].filter(Boolean).join(", ");
        if (mstDescription && assetDesc1) return `${mstDescription} on ${assetDesc1}`;
        if (mstDescription) return mstDescription;
        if (assetDesc1) return `MST on ${assetDesc1}`;
        return "MST";
    };

    U.showToast = function(message, options = {}) {
        const text = (message ?? "").toString().trim();
        if (!text) return null;

        const duration = Number.isFinite(options.duration) ? options.duration : 2000;
        const type = ["success", "info", "warning", "error"].includes(options.type)
            ? options.type
            : "success";

        let region = document.getElementById("mstToastRegion");
        if (!region) {
            region = document.createElement("div");
            region.id = "mstToastRegion";
            region.className = "mst-toast-region";
            region.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
            region.setAttribute("aria-atomic", "false");
            document.body.appendChild(region);
        }

        const toast = document.createElement("div");
        toast.className = `mst-toast mst-toast--${type}`;
        toast.setAttribute("role", type === "error" ? "alert" : "status");

        const icon = document.createElement("span");
        icon.className = "mst-toast__icon";
        icon.setAttribute("aria-hidden", "true");
        icon.textContent = {
            success: "✓",
            info: "i",
            warning: "!",
            error: "!"
        }[type];

        const body = document.createElement("div");
        body.className = "mst-toast__body";
        body.textContent = text;

        toast.append(icon, body);
        region.appendChild(toast);

        requestAnimationFrame(() => toast.classList.add("is-visible"));

        window.setTimeout(() => {
            toast.classList.remove("is-visible");
            toast.addEventListener("transitionend", () => toast.remove(), { once: true });
            window.setTimeout(() => toast.remove(), 350);
        }, duration);

        return toast;
    };

})();
