document.addEventListener("DOMContentLoaded", function () {

  /* ===========================================================
     FileUpload.js  
     Handles:
     - File input
     - XLSX/CSV parsing
     - Work Group Set selection modal
     - Dataset filtering
     - Triggering MST.Editor.loadMSTs()
     =========================================================== */

  /** Utility: populate <select> with unique values */
  function populateUnique(selectEl, rows, field) {
    if (!selectEl) return;
    const vals = [...new Set(rows.map(r => safeTrim(r[field])))].sort();

    selectEl.innerHTML = `<option value="">(All)</option>`;
    vals.forEach(v => {
      if (!v) return;
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
  }

  const fileInput = document.getElementById("fileInput");
  const loading   = document.getElementById("loading");
  const downloadDateDisplay = document.getElementById("downloadDateDisplay");
  const downloadDateWarning = document.getElementById("downloadDateWarning");

  /** Safely coerce any value to a trimmed string */
  function safeTrim(value) {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).trim();
    }
    if (value instanceof Date) return value.toISOString().trim();
    return "";
  }

  function parseDownloadDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "number") {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      return new Date(excelEpoch.getTime() + value * 86400000);
    }
    if (typeof value === "string") {
      const parsed = new Date(value);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  if (!fileInput) {
    console.error("❌ FileUpload.js: #fileInput not found in DOM");
    return;
  }

  function buildEquipmentDescMap(rows) {
    const map = new Map();

    rows.forEach(r => {
      const eq = safeTrim(r["Equipment Number"]);
      if (!eq) return;

      const desc = safeTrim(r["Equipment Description 1"]);
      if (!map.has(eq)) {
        map.set(eq, desc);
      }
    });

    return map;
  }

  fileInput.addEventListener("change", e => {
    const file = e.target.files[0];
    if (!file) return;

    if (loading) loading.style.display = "block";

    const reader = new FileReader();
    reader.onload = function(ev) {
      try {
        const data = new Uint8Array(ev.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        const fullRows = json;

        // Build equipment descriptions from the complete, unfiltered download
        window.fullDownloadRows     = fullRows;
        window.equipmentDescriptions = buildEquipmentDescMap(fullRows);

        const downloadDateRaw = fullRows[0]?.["Download Date"];
        const downloadDate = parseDownloadDate(downloadDateRaw);

        if (downloadDateDisplay) {
          if (downloadDate) {
            downloadDateDisplay.textContent = `Download Date: ${downloadDate.toLocaleDateString()}`;
          } else {
            downloadDateDisplay.textContent = "Download Date: Not found";
          }
        }

        if (downloadDateWarning) {
          downloadDateWarning.style.display = "none";
          downloadDateWarning.textContent = "";

          if (downloadDate) {
            const diffDays = (Date.now() - downloadDate.getTime()) / 86400000;
            if (diffDays > 7) {
              downloadDateWarning.textContent =
                "The MST data is older than 7 days. Please contact your SSM team to refresh the download. Continuing may result in Data Errors —proceed at your own risk.";
              downloadDateWarning.style.display = "block";
            }
          }
        }

        // Save master rows
        window.originalRows = fullRows;

        // ========= Work Group Modal =========
        const wgSelectModal    = document.getElementById("wgSelectModal");
        const wgSelectDropdown = document.getElementById("wgSelectDropdown");

        const wgPairs = new Map();
        fullRows.forEach(r => {
          const code = safeTrim(r["Work Group Set Code"]);
          const desc = safeTrim(r["Work Group Description"]);
          if (code && desc) wgPairs.set(code, desc);
        });

        wgSelectDropdown.innerHTML = "";
        [...wgPairs.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .forEach(([code, desc]) => {
            const opt = document.createElement("option");
            opt.value = code;
            opt.textContent = `${code} — ${desc}`;
            wgSelectDropdown.appendChild(opt);
          });

        wgSelectModal.style.display = "flex";

        document.getElementById("wgSelectConfirm").onclick = () => {
          const selected = [...wgSelectDropdown.selectedOptions].map(o => o.value);
          if (!selected.length) {
            alert("Please select at least one Work Group Set.");
            return;
          }

          wgSelectModal.style.display = "none";

          const filtered = fullRows.filter(r =>
            selected.includes(safeTrim(r["Work Group Set Code"]))
          );

          window.originalRows = filtered;

          window.equipmentDescriptions = new Map();
          filtered.forEach(r => {
            const eq = safeTrim(r["Equipment Number"]);
            if (!eq) return;
            const desc = safeTrim(r["Equipment Description 1"]);
            if (!window.equipmentDescriptions.has(eq)) {
              window.equipmentDescriptions.set(eq, desc);
            }
          });

          populateUnique(document.getElementById("filterWorkGroup"),  filtered, "Work Group Code");
          populateUnique(document.getElementById("filterJobDesc"),    filtered, "Job Description Code");
          populateUnique(document.getElementById("filterDesc1"),      filtered, "MST Description 1");
          populateUnique(document.getElementById("filterDesc2"),      filtered, "MST Description 2");
          populateUnique(document.getElementById("filterProtType"),   filtered, "Protection Type Code");
          populateUnique(document.getElementById("filterProtMethod"), filtered, "Protection Method Code");
          populateUnique(document.getElementById("filterEquipDesc1"), filtered, "Equipment Description 1");

          window.allEquipNumbers = [...new Set(
            filtered.map(r => safeTrim(r["Equipment Number"]))
          )];

          MST.Editor.loadMSTs(filtered);
        };

      } catch (err) {
        console.error(err);
        alert("Failed to read MST file. Check formatting.");
      } finally {
        if (loading) loading.style.display = "none";
      }
    };

    reader.readAsArrayBuffer(file);
  });

});
