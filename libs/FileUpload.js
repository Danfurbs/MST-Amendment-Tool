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

  function deriveMstId(row) {
    const concat = safeTrim(row["CONCAT"]);
    if (concat) return concat;

    const equipmentNo = safeTrim(row["Equipment Number"]);
    const taskNumber = safeTrim(row["MST Task Number"]);

    if (equipmentNo && taskNumber) {
      return `${equipmentNo}_${taskNumber.padStart(3, "0")}`;
    }

    return "";
  }

  function evaluateErrorFlags(rows) {
    const registry = window.MST?.ErrorFlags;

    if (!registry || typeof registry.evaluateAll !== "function") {
      return { annotatedRows: rows, summary: null, details: null };
    }

    const summary = {};
    const details = {};
    const ruleList = Array.isArray(registry.rules) ? registry.rules : [];
    ruleList.forEach(rule => {
      summary[rule.id] = 0;
      details[rule.id] = [];
    });

    const annotatedRows = rows.map(row => {
      const evaluationRow = {
        ...row,
        LastScheduledDate: row["Last Scheduled Date"],
        LSD: row["Last Scheduled Date"],
        UnitsRequired: row["Units Required"],
        Units: row["Units Required"]
      };

      const mstId = deriveMstId(row);
      const desc1 = safeTrim(row["MST Description 1"]);
      const desc2 = safeTrim(row["MST Description 2"]);
      const label = [mstId, desc1, desc2].filter(Boolean).join(" — ") || "(Unknown MST)";

      const matches = registry.evaluateAll(evaluationRow) || [];
      matches.forEach(id => {
        summary[id] = (summary[id] || 0) + 1;

        if (details[id]) {
          details[id].push({ mstId, desc1, desc2, label });
        }
      });

      return {
        ...row,
        _errorFlags: matches,
        _mstId: mstId
      };
    });

    return { annotatedRows, summary, details };
  }

  function openMstFromErrorList(mstId) {
    if (!mstId) return;

    const baseEvent = window.calendar?.getEventById(`${mstId}_0`);
    if (!baseEvent) {
      alert(`MST ${mstId} is not currently loaded on the calendar.`);
      return;
    }

    if (typeof window.MST?.Editor?.openEditorForMST === "function") {
      window.MST.Editor.openEditorForMST(mstId, baseEvent);

      const form = document.getElementById("editForm");
      if (form) form.scrollIntoView({ behavior: "smooth" });
    }
  }

  function reapplyErrorEvaluation(rows) {
    const { annotatedRows, summary, details } = evaluateErrorFlags(rows);

    window.originalRows = annotatedRows;
    window.mstErrorFlagSummary = summary;
    window.mstErrorFlagDetails = details;

    renderErrorSummary(summary, details);

    return annotatedRows;
  }

  function recheckSingleMst(mstId) {
    if (!mstId) return;

    const rows = Array.isArray(window.originalRows)
      ? [...window.originalRows]
      : [];

    const idx = rows.findIndex(r => r._mstId === mstId);
    if (idx === -1) return;

    const baseEvent = window.calendar?.getEventById(`${mstId}_0`);
    if (baseEvent) {
      const iso = window.MST?.Utils?.dateToInputYYYYMMDD?.(baseEvent.start) || "";
      if (iso) {
        rows[idx]["Last Scheduled Date"] = iso.replace(/-/g, "");
      }

      rows[idx]["Units Required"] = baseEvent.extendedProps.unitsRequired ?? rows[idx]["Units Required"];
      rows[idx]["MST Description 2"] = baseEvent.extendedProps.desc2 ?? rows[idx]["MST Description 2"];
      rows[idx]["Work Group Code"] = baseEvent.extendedProps.workGroup ?? rows[idx]["Work Group Code"];
      rows[idx]["Job Description Code"] = baseEvent.extendedProps.jobDescCode ?? rows[idx]["Job Description Code"];
      rows[idx]["Protection Type Code"] = baseEvent.extendedProps.protType ?? rows[idx]["Protection Type Code"];
      rows[idx]["Protection Method Code"] = baseEvent.extendedProps.protMethod ?? rows[idx]["Protection Method Code"];
      rows[idx]["MST Segment Mileage From"] = baseEvent.extendedProps.segFrom ?? rows[idx]["MST Segment Mileage From"];
      rows[idx]["MST Segment Mileage To"] = baseEvent.extendedProps.segTo ?? rows[idx]["MST Segment Mileage To"];
    }

    reapplyErrorEvaluation(rows);
  }

  function renderErrorSummary(summary, details) {
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
    const detailBox = document.createElement("div");
    detailBox.className = "error-details";
    detailBox.textContent = "Click a rule to view the MSTs that were flagged. Click a specific MST to open it in the editor.";

    const showDetailsForRule = ruleId => {
      if (!detailBox) return;
      const entries = (details && details[ruleId]) || [];

      if (!entries.length) {
        detailBox.textContent = "No MSTs were flagged for this rule.";
        return;
      }

      detailBox.innerHTML = "";
      const header = document.createElement("h4");
      const rule = rules.find(r => r.id === ruleId);
      header.textContent = `${rule?.description || ruleId} — ${entries.length} flagged`;
      detailBox.appendChild(header);

      const ul = document.createElement("ul");
      entries.forEach(entry => {
        const li = document.createElement("li");
        const titleParts = [entry.mstId, entry.desc1, entry.desc2].filter(Boolean);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "link-btn mst-link";
        btn.textContent = titleParts.length
          ? titleParts.join(" — ")
          : entry.label;
        btn.addEventListener("click", () => openMstFromErrorList(entry.mstId));
        li.appendChild(btn);
        ul.appendChild(li);
      });

      detailBox.appendChild(ul);
    };

    rules.forEach(rule => {
      const count = summary[rule.id] || 0;
      const li = document.createElement("li");
      const label = `${rule.description || rule.id}: ${count} MST${count === 1 ? "" : "s"}`;
      li.textContent = label;

      if (details && details[rule.id]?.length) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "link-btn";
        btn.textContent = "Show list";
        btn.addEventListener("click", () => showDetailsForRule(rule.id));
        li.appendChild(btn);
      }

      list.appendChild(li);
    });

    errorSummaryEl.appendChild(list);
    errorSummaryEl.appendChild(detailBox);
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

          const annotatedRows = reapplyErrorEvaluation(filtered);

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

  window.MST = window.MST || {};
  window.MST.ErrorUI = {
    openMstFromErrorList,
    recheckSingleMst
  };

});
