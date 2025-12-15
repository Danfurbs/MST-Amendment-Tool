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
  const loading = document.getElementById("loading");
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

  const DEBUG_STEPS = Boolean(window.FILE_UPLOAD_DEBUG);
  function debugStep(label) {
    if (!DEBUG_STEPS) return;
    const prefix = "[FileUpload]";
    console.debug(`${prefix} ${label}`);
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

  function getDownloadDateValue(row) {
    if (!row || typeof row !== "object") return null;

    if (Object.prototype.hasOwnProperty.call(row, "Download Date")) {
      return row["Download Date"];
    }

    const matchingKey = Object.keys(row).find(key => {
      return typeof key === "string" && key.trim().toLowerCase() === "download date";
    });

    return matchingKey ? row[matchingKey] : null;
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
      const assetStatus = safeTrim(row["Asset Status Code"]) || safeTrim(row["Asset Status"]);
      const tvRef =
        safeTrim(row["Temp Var Reference Number"]) ||
        safeTrim(row["TV Reference"]);
      const normalizeDate = window.MST?.Utils?.normalizeDateInput;
      const rawTvExpiry = row["TV Expiry Date"] ?? row["Temp Var Expiry Date"];
      const tvExpiryNormalized = typeof normalizeDate === "function"
        ? normalizeDate(rawTvExpiry)
        : safeTrim(rawTvExpiry);

      const evaluationRow = {
        ...row,
        LastScheduledDate: row["Last Scheduled Date"],
        LSD: row["Last Scheduled Date"],
        UnitsRequired: row["Units Required"],
        Units: row["Units Required"],
        AssetStatusCode: assetStatus,
        AssetStatus: assetStatus,
        tvReference: tvRef,
        tvExpiryNormalized
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
    window.mstErrorFlaggedMap = details;

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
        rows[idx]["Allow Multiple workorders"] = baseEvent.extendedProps.allowMultiple ?? rows[idx]["Allow Multiple workorders"];
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

    const renderDetailsForRule = (container, ruleId) => {
      if (!container) return;
      const entries = (details && details[ruleId]) || [];

      container.innerHTML = "";

      if (!entries.length) {
        container.textContent = "No MSTs were flagged for this rule.";
        return;
      }

      const header = document.createElement("h4");
      const rule = rules.find(r => r.id === ruleId);
      header.textContent = `${rule?.description || ruleId} — ${entries.length} flagged`;
      container.appendChild(header);

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

      container.appendChild(ul);
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
        const detailBox = document.createElement("div");
        detailBox.className = "error-details";
        detailBox.style.display = "none";

        btn.addEventListener("click", () => {
          const isHidden = detailBox.style.display === "none";
          if (isHidden) {
            renderDetailsForRule(detailBox, rule.id);
            detailBox.style.display = "block";
          } else {
            detailBox.style.display = "none";
          }
        });
        li.appendChild(btn);
        li.appendChild(detailBox);
      }

      list.appendChild(li);
    });

    errorSummaryEl.appendChild(list);
  }

  function lockDataSourceControl() {
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

  function parseAndLoadWorkbook(rawData, workbookType) {
    debugStep("Workbook data captured");

    try {
      const workbook = XLSX.read(rawData, { type: workbookType });
      debugStep("Workbook parsed");

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      debugStep("Primary sheet located");

      if (!sheet) {
        throw new Error("No sheets were found in the uploaded workbook.");
      }

      const json = XLSX.utils.sheet_to_json(sheet, {
        blankrows: false
      });

      debugStep("Sheet converted to JSON");

      const fullRows = json;

      // Build equipment descriptions from the complete, unfiltered download
      window.fullDownloadRows     = fullRows;
      window.equipmentDescriptions = buildEquipmentDescMap(fullRows);

      debugStep("Master rows stored and equipment map built");

      const downloadDateRaw = getDownloadDateValue(fullRows[0]);
      const downloadDate = parseDownloadDate(downloadDateRaw);

      debugStep("Download date parsed");

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
              "The MST data is older than 7 days. Please contact your SSM team to refresh the download. Continuing may result in Data Errors — proceed at your own risk.";
            downloadDateWarning.style.display = "block";
          }
        }
      }

      // Save master rows
      window.originalRows = fullRows;

      // ========= Work Group Modal =========
      const wgSelectModal    = document.getElementById("wgSelectModal");
      const wgSelectDropdown = document.getElementById("wgSelectDropdown");

      if (!wgSelectModal || !wgSelectDropdown) {
        throw new Error("Work Group selection modal controls were not found in the DOM.");
      }

      debugStep("Work group modal found");

      const wgPairs = new Map();
      fullRows.forEach(r => {
        const code = safeTrim(r["Work Group Set Code"]);
        const desc = safeTrim(r["Work Group Description"]);
        if (code && desc) wgPairs.set(code, desc);
      });

      debugStep("Work group options built");

      wgSelectDropdown.innerHTML = "";
      [...wgPairs.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([code, desc]) => {
          const opt = document.createElement("option");
          opt.value = code;
          opt.textContent = `${code} — ${desc}`;
          wgSelectDropdown.appendChild(opt);
        });

      debugStep("Work group dropdown populated");

      wgSelectModal.style.display = "flex";

      debugStep("Work group modal displayed");

      document.getElementById("wgSelectConfirm").onclick = () => {
        debugStep("Work group confirmation clicked");

        const selected = [...wgSelectDropdown.selectedOptions].map(o => o.value);
        if (!selected.length) {
          alert("Please select at least one Work Group Set.");
          return;
        }

        wgSelectModal.style.display = "none";

        debugStep("Work group modal hidden");

        const filtered = fullRows.filter(r =>
          selected.includes(safeTrim(r["Work Group Set Code"]))
        );

        debugStep("Rows filtered by work group");

        const annotatedRows = reapplyErrorEvaluation(filtered);

        debugStep("Error flags applied");

        populateUnique(document.getElementById("filterWorkGroup"),  annotatedRows, "Work Group Code");
        populateUnique(document.getElementById("filterJobDesc"),    annotatedRows, "Job Description Code");
        populateUnique(document.getElementById("filterDesc1"),      annotatedRows, "MST Description 1");
        populateUnique(document.getElementById("filterDesc2"),      annotatedRows, "MST Description 2");
        populateUnique(document.getElementById("filterProtType"),   annotatedRows, "Protection Type Code");
        populateUnique(document.getElementById("filterProtMethod"), annotatedRows, "Protection Method Code");
        populateUnique(document.getElementById("filterEquipDesc1"), annotatedRows, "Equipment Description 1");

        debugStep("Filter dropdowns populated");

        // Keep the equipment number pool unfiltered so description lookups work for
        // any record contained in the original download
        window.allEquipNumbers = [...new Set(
          (window.fullDownloadRows || []).map(r => safeTrim(r["Equipment Number"]))
        )];

        debugStep("Equipment numbers cached");

        lockDataSourceControl();

        debugStep("Data source control locked");

        try {
          debugStep("Requesting MST render");
          MST.Editor.loadMSTs(annotatedRows);
          debugStep("MST render requested successfully");
        } catch (err) {
          console.error("❌ Failed to render MSTs", err);
          alert("The MSTs could not be displayed. Please retry or contact support.");
        }
      };

    } catch (err) {
      console.error(err);
      const msg = err?.message || "Failed to read MST file. Check formatting.";
      alert(msg);
    } finally {
      if (loading) loading.style.display = "none";
    }
  }

  fileInput.addEventListener("change", e => {
    debugStep("File change event fired");

    const file = e.target.files[0];
    if (!file) return;

    if (loading) loading.style.display = "block";

    debugStep("Loading indicator shown");

    const reader = new FileReader();

    debugStep("FileReader created");
    reader.onload = function(ev) {
      debugStep("FileReader onload triggered");

      try {
        const data = ev.target.result;
        parseAndLoadWorkbook(data, "binary");
      } catch (err) {
        console.error(err);
        const msg = err?.message || "Failed to read MST file. Check formatting.";
        alert(msg);
        if (loading) loading.style.display = "none";
      }
    };

    reader.readAsBinaryString(file);
  });

  window.MST = window.MST || {};
  window.MST.ErrorUI = {
    openMstFromErrorList,
    recheckSingleMst
  };

});
