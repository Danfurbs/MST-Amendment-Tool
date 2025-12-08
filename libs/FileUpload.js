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
  const fileInputLabel = document.querySelector('label[for="fileInput"]');
  const fileInputLabelText = document.querySelector(".file-upload-label-text");
  const loading   = document.getElementById("loading");
  const downloadDateDisplay = document.getElementById("downloadDateDisplay");
  const downloadDateWarning = document.getElementById("downloadDateWarning");
  const errorSummaryEl = document.getElementById("mstErrorSummary");

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

  function evaluateErrorFlags(rows) {
    const registry = window.MST?.ErrorFlags;

    if (!registry || typeof registry.evaluateAll !== "function") {
      return { annotatedRows: rows, summary: null, flaggedMap: {} };
    }

    const summary = {};
    const flaggedMap = {};
    const ruleList = Array.isArray(registry.rules) ? registry.rules : [];
    ruleList.forEach(rule => {
      summary[rule.id] = 0;
      flaggedMap[rule.id] = [];
    });

    const annotatedRows = rows.map(row => {
      const evaluationRow = {
        ...row,
        LastScheduledDate: row["Last Scheduled Date"],
        LSD: row["Last Scheduled Date"],
        UnitsRequired: row["Units Required"],
        Units: row["Units Required"]
      };

      const matches = registry.evaluateAll(evaluationRow) || [];
      matches.forEach(id => {
        summary[id] = (summary[id] || 0) + 1;
        flaggedMap[id]?.push(row);
      });

      return {
        ...row,
        _errorFlags: matches
      };
    });

    return { annotatedRows, summary, flaggedMap };
  }

  function renderErrorSummary(summary) {
    if (!errorSummaryEl) return;

    const rules = Array.isArray(window.MST?.ErrorFlags?.rules)
      ? window.MST.ErrorFlags.rules
      : [];

    if (!summary || !rules.length) {
      errorSummaryEl.innerHTML = "<div><strong>MST error checks:</strong></div><div>No error rules are available.</div>";
      return;
    }

    errorSummaryEl.innerHTML = "<div><strong>MST error checks:</strong></div>";

    const list = document.createElement("ul");
    rules.forEach(rule => {
      const count = summary[rule.id] || 0;
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "error-rule-link";
      btn.textContent = `${rule.description || rule.id}: ${count} MST${count === 1 ? "" : "s"}`;
      btn.addEventListener("click", () => {
        if (window.MST?.Views?.showFlaggedList) {
          window.MST.Views.showFlaggedList(rule.id);
        }
      });

      li.appendChild(btn);
      list.appendChild(li);
    });

    errorSummaryEl.appendChild(list);
  }

  function lockFileInput() {
    if (fileInput) {
      fileInput.disabled = true;
    }

    if (fileInputLabel) {
      fileInputLabel.classList.add("disabled");
      fileInputLabel.title = "File loaded";
    }

    if (fileInputLabelText) {
      fileInputLabelText.textContent = "\ud83d\udd12";
    }
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

          const { annotatedRows, summary, flaggedMap } = evaluateErrorFlags(filtered);

          window.originalRows = annotatedRows;
          window.mstErrorFlagSummary = summary;
          window.mstErrorFlaggedMap = flaggedMap;

          renderErrorSummary(summary);

          populateUnique(document.getElementById("filterWorkGroup"),  annotatedRows, "Work Group Code");
          populateUnique(document.getElementById("filterJobDesc"),    annotatedRows, "Job Description Code");
          populateUnique(document.getElementById("filterDesc1"),      annotatedRows, "MST Description 1");
          populateUnique(document.getElementById("filterDesc2"),      annotatedRows, "MST Description 2");
          populateUnique(document.getElementById("filterProtType"),   annotatedRows, "Protection Type Code");
          populateUnique(document.getElementById("filterProtMethod"), annotatedRows, "Protection Method Code");
          populateUnique(document.getElementById("filterEquipDesc1"), annotatedRows, "Equipment Description 1");

          // Keep the equipment number pool unfiltered so description lookups work for
          // any record contained in the original download
          window.allEquipNumbers = [...new Set(
            (window.fullDownloadRows || []).map(r => safeTrim(r["Equipment Number"]))
          )];

          lockFileInput();

          MST.Editor.loadMSTs(annotatedRows);
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
