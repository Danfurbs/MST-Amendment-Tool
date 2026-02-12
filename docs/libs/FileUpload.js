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

  function populateSelectValues(selectEl, values) {
    if (!selectEl) return;
    selectEl.innerHTML = "";
    values.forEach(value => {
      if (!value) return;
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = value;
      selectEl.appendChild(opt);
    });
  }

  const fileInput = document.getElementById("fileInput");
  const previousBatchInput = document.getElementById("previousBatchInput");
  const continueBatchBtn = document.getElementById("continueBatchBtn");
  const fileInputLabel = document.querySelector('label[for="fileInput"]');
  const fileInputLabelText = document.querySelector(".file-upload-label-text");
  const loading = document.getElementById("loading");
  const downloadDateDisplay = document.getElementById("downloadDateDisplay");
  const downloadDateWarning = document.getElementById("downloadDateWarning");
  const errorSummaryEl = document.getElementById("mstErrorSummary");
  const INITIAL_LOAD_THRESHOLD = 6000;

  // Loading overlay elements
  const loadingOverlay = document.getElementById("loadingOverlay");
  const loadingTitle = document.getElementById("loadingTitle");
  const loadingMessage = document.getElementById("loadingMessage");
  const loadingProgressBar = document.getElementById("loadingProgressBar");
  const loadingStep = document.getElementById("loadingStep");
  const resumeBatchModal = document.getElementById("resumeBatchModal");
  const resumeBatchMessage = document.getElementById("resumeBatchMessage");
  const resumeBatchUpload = document.getElementById("resumeBatchUpload");
  const resumeBatchCancel = document.getElementById("resumeBatchCancel");

  let pendingSessionPayload = null;

  /** Show loading overlay with progress */
  function showLoading(title, message, step) {
    if (loadingOverlay) {
      loadingOverlay.classList.add("active");
      loadingOverlay.setAttribute("aria-hidden", "false");
    }
    if (loadingTitle) loadingTitle.textContent = title || "Loading...";
    if (loadingMessage) loadingMessage.textContent = message || "";
    if (loadingStep) loadingStep.textContent = step || "";
    if (loadingProgressBar) loadingProgressBar.style.width = "0%";
  }

  /** Update loading progress */
  function updateLoadingProgress(percent, step) {
    if (loadingProgressBar) loadingProgressBar.style.width = `${Math.min(100, percent)}%`;
    if (loadingStep && step) loadingStep.textContent = step;
  }

  /** Hide loading overlay */
  function hideLoading() {
    if (loadingOverlay) {
      loadingOverlay.classList.remove("active");
      loadingOverlay.setAttribute("aria-hidden", "true");
    }
    if (loading) loading.style.display = "none";
  }

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
      const trimmed = value.trim();
      const numeric = Number(trimmed);

      if (!Number.isNaN(numeric) && /^\d+(\.\d+)?$/.test(trimmed)) {
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        return new Date(excelEpoch.getTime() + numeric * 86400000);
      }

      if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
        const [dd, mm, yyyy] = trimmed.split("/").map(part => Number(part));
        const parsed = new Date(yyyy, mm - 1, dd);
        return isNaN(parsed) ? null : parsed;
      }

      const parsed = new Date(trimmed);
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

  function findFirstDownloadDate(rows) {
    if (!Array.isArray(rows)) return null;

    for (const row of rows) {
      const raw = getDownloadDateValue(row);
      if (raw == null) continue;

      const trimmed = safeTrim(raw);
      if (trimmed !== "") return raw;
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


  function parseSessionPayloadFromWorkbook(workbook) {
    const sessionSheet = workbook.Sheets["_MST_SESSION"];
    if (!sessionSheet) return null;

    const rows = XLSX.utils.sheet_to_json(sessionSheet, { header: 1, blankrows: false, defval: "" });
    if (!rows.length) return null;

    const rowMap = new Map();
    rows.forEach(r => {
      if (!Array.isArray(r) || !r.length) return;
      const key = safeTrim(r[0]);
      if (!key) return;
      rowMap.set(key, r[1] ?? "");
    });

    const schema = safeTrim(rowMap.get("SESSION_SCHEMA"));
    if (schema !== "MST_BATCH_RESUME_V1") return null;

    const chunkCount = Number.parseInt(rowMap.get("PAYLOAD_CHUNK_COUNT"), 10);
    if (!Number.isFinite(chunkCount) || chunkCount <= 0) return null;

    const chunks = [];
    for (let i = 1; i <= chunkCount; i += 1) {
      const chunkNo = String(i).padStart(4, "0");
      const key = `PAYLOAD_${chunkNo}`;
      chunks.push(String(rowMap.get(key) ?? ""));
    }

    const payloadText = chunks.join("");
    if (!payloadText) return null;

    return JSON.parse(payloadText);
  }

  function showResumeModal(message) {
    if (!resumeBatchModal) return;
    if (resumeBatchMessage) {
      resumeBatchMessage.textContent = message || "Please upload the latest MST download to continue this batch.";
    }
    resumeBatchModal.style.display = "flex";
  }

  function hideResumeModal() {
    if (!resumeBatchModal) return;
    resumeBatchModal.style.display = "none";
  }

  function parseIsoDateToLocal(iso) {
    if (!iso || typeof iso !== "string") return null;
    const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    const d = new Date(year, month, day, 9, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function applyDeactivatedStyle(baseEvent) {
    if (!baseEvent) return;
    baseEvent.setProp("backgroundColor", "#000");
    baseEvent.setProp("borderColor", "#000");
    baseEvent.setProp("textColor", "#fff");
    baseEvent.setProp("classNames", ["deactivated-mst"]);
  }

  function hydrateCreatedMstFromSession(createdRows) {
    if (!window.calendar || !Array.isArray(createdRows)) return;

    createdRows.forEach(row => {
      const equipNo = safeTrim(row["Equipment"]);
      const stdJobNo = safeTrim(row["Std Job No"]);
      if (!equipNo || !stdJobNo) return;

      const mstId = `${equipNo}_${stdJobNo}`;
      if (window.calendar.getEventById(`${mstId}_0`)) return;

      const lsd = safeTrim(row["LSD"]);
      const normalizedLsd = (window.MST?.Utils?.normalizeDateInput?.(lsd) || "");
      const startDate = parseIsoDateToLocal(normalizedLsd);
      if (!startDate) return;

      const frequency = Number.parseInt(row["Freq"], 10) || 0;
      const desc1 = safeTrim(row["MST Desc 1"]);
      const desc2 = safeTrim(row["MST Desc 2"]);

      window.calendar.addEvent({
        id: `${mstId}_0`,
        title: `${equipNo} — ${desc1}`,
        start: startDate,
        backgroundColor: window.MST?.Utils?.BASE_COLOR || "#10b981",
        borderColor: window.MST?.Utils?.BASE_COLOR || "#10b981",
        extendedProps: {
          mstId,
          equipmentNo: equipNo,
          taskNo: "",
          stdJobNo,
          desc1,
          desc2,
          frequency,
          workGroup: safeTrim(row["Work Group"]),
          jobDescCode: safeTrim(row["Job Desc Code"]),
          unitsRequired: safeTrim(row["Unit Required"]),
          stdJobUom: safeTrim(row["Unit of Work"]),
          unitMeasure: safeTrim(row["Unit of Work"]),
          segFrom: safeTrim(row["Segment From"]),
          segTo: safeTrim(row["Segment To"]),
          protType: safeTrim(row["ProtectionType"]),
          protMethod: safeTrim(row["ProtectionMethod"]),
          allowMultiple: safeTrim(row["Allow Multiple workorders"]),
          instance: 0,
          isNew: true,
          tvReference: safeTrim(row["TV Reference"]),
          tvExpiryDate: safeTrim(row["TV Expiry Date"]),
          hasTvReference: Boolean(safeTrim(row["TV Reference"]))
        }
      });

      if (typeof window.MST?.Editor?.rebuildFutureInstances === "function") {
        window.MST.Editor.rebuildFutureInstances(mstId, startDate, frequency, desc1, desc2);
      }
    });
  }

  function applySessionPayload(payload) {
    if (!payload || typeof payload !== "object") {
      alert("The selected batch file did not contain usable session data.");
      return;
    }

    const sessionChanges = payload.changes && typeof payload.changes === "object" ? payload.changes : {};
    const sessionCreated = payload.createdMSTs && typeof payload.createdMSTs === "object" ? payload.createdMSTs : {};

    if (!window.changes || typeof window.changes !== "object") window.changes = {};
    if (!window.createdMSTs || typeof window.createdMSTs !== "object") window.createdMSTs = {};

    const missingMstIds = [];
    const changeEntries = Object.entries(sessionChanges);

    changeEntries.forEach(([mstId, row]) => {
      const baseEvent = window.calendar?.getEventById(`${mstId}_0`);
      if (!baseEvent) {
        missingMstIds.push(mstId);
        return;
      }

      const props = baseEvent.extendedProps || {};

      if (row.New_Frequency !== undefined && row.New_Frequency !== "") props.frequency = row.New_Frequency;
      if (row.New_Desc2 !== undefined) props.desc2 = row.New_Desc2;
      if (row.New_Work_Group_Code !== undefined && row.New_Work_Group_Code !== "") props.workGroup = row.New_Work_Group_Code;
      if (row.New_Job_Desc_Code !== undefined && row.New_Job_Desc_Code !== "") props.jobDescCode = row.New_Job_Desc_Code;
      if (row.New_Units_Required !== undefined && row.New_Units_Required !== "") props.unitsRequired = row.New_Units_Required;
      if (row.New_Segment_From !== undefined && row.New_Segment_From !== "") props.segFrom = row.New_Segment_From;
      if (row.New_Segment_To !== undefined && row.New_Segment_To !== "") props.segTo = row.New_Segment_To;
      if (row.New_Protection_Type_Code !== undefined && row.New_Protection_Type_Code !== "") props.protType = row.New_Protection_Type_Code;
      if (row.New_Protection_Method_Code !== undefined && row.New_Protection_Method_Code !== "") props.protMethod = row.New_Protection_Method_Code;
      if (row.New_Allow_Multiple_Workorders !== undefined) props.allowMultiple = row.New_Allow_Multiple_Workorders;
      if (row.New_TV_Reference !== undefined) props.tvReference = row.New_TV_Reference;
      if (row.New_TV_Expiry_Date !== undefined) props.tvExpiryDate = row.New_TV_Expiry_Date;
      baseEvent.setExtendedProp("_resumeApplied", true);

      if (row.New_Last_Scheduled_Date) {
        const normalized = window.MST?.Utils?.normalizeDateInput?.(row.New_Last_Scheduled_Date) || "";
        const lastSched = parseIsoDateToLocal(normalized);
        if (lastSched) baseEvent.setStart(lastSched);
      }

      if (row.New_Scheduling_Indicator_Code === "9" || row.New_Work_Group_Code === "DNXXXXX") {
        applyDeactivatedStyle(baseEvent);
      } else if (typeof window.MST?.Editor?.markMSTAsChanged === "function") {
        window.MST.Editor.markMSTAsChanged(mstId);
      }

      window.changes[mstId] = row;
    });

    Object.assign(window.createdMSTs, sessionCreated);
    hydrateCreatedMstFromSession(Object.values(sessionCreated));

    if (window.changeCount) {
      window.changeCount.innerText = `Changes: ${Object.keys(window.changes).length}`;
    }

    const newMstCountEl = document.getElementById("newMstCount");
    if (newMstCountEl) {
      const count = Object.keys(window.createdMSTs || {}).length;
      newMstCountEl.textContent = count ? `New MSTs: ${count}` : "";
    }

    if (payload.batchNumber) {
      const batchInput = document.getElementById("batchNumber");
      const compact = document.getElementById("batchNumberCompact");
      if (batchInput && !batchInput.value.trim()) batchInput.value = payload.batchNumber;
      if (compact && batchInput) compact.value = batchInput.value;
    }

    if (missingMstIds.length) {
      const preview = missingMstIds.slice(0, 10).join(", ");
      const suffix = missingMstIds.length > 10 ? ` ... (+${missingMstIds.length - 10} more)` : "";
      alert(
        `Imported batch with ${changeEntries.length} saved change(s).

` +
        `${missingMstIds.length} MST(s) are no longer in the current download and could not be re-applied:
` +
        `${preview}${suffix}`
      );
      return;
    }

    alert("Previous batch data has been imported and re-applied.");
  }

  function handleSessionWorkbook(data) {
    try {
      const workbook = XLSX.read(data, { type: "binary" });
      const payload = parseSessionPayloadFromWorkbook(workbook);

      if (!payload) {
        alert("No resumable batch metadata was found in that file.");
        return;
      }

      const hasSavedChanges = Object.keys(payload.changes || {}).length > 0;
      const hasDownloadLoaded = Array.isArray(window.originalRows) && window.originalRows.length > 0;

      if (!hasDownloadLoaded && hasSavedChanges) {
        pendingSessionPayload = payload;
        showResumeModal("This batch includes MST amendments. Upload the latest MST download first so we can re-apply the saved changes safely.");
        return;
      }

      applySessionPayload(payload);
    } catch (err) {
      console.error(err);
      alert("Unable to read the selected batch file. Please choose an exported MST Changes workbook.");
    }
  }

  function parseAndLoadWorkbook(rawData, workbookType) {
    debugStep("Workbook data captured");
    updateLoadingProgress(20, "Parsing Excel workbook...");

    try {
      const workbook = XLSX.read(rawData, { type: workbookType });
      debugStep("Workbook parsed");
      updateLoadingProgress(35, "Reading spreadsheet data...");

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      debugStep("Primary sheet located");

      if (!sheet) {
        throw new Error("No sheets were found in the uploaded workbook.");
      }

      const json = XLSX.utils.sheet_to_json(sheet, {
        blankrows: false
      });

      debugStep("Sheet converted to JSON");
      updateLoadingProgress(50, `Found ${json.length.toLocaleString()} rows...`);

      const fullRows = json;

      // Build equipment descriptions from the complete, unfiltered download
      window.fullDownloadRows     = fullRows;
      window.equipmentDescriptions = buildEquipmentDescMap(fullRows);
      updateLoadingProgress(60, "Building equipment index...");

      debugStep("Master rows stored and equipment map built");

      const downloadDateRaw = findFirstDownloadDate(fullRows);
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
      const wgUseAdditionalFilters = document.getElementById("wgUseAdditionalFilters");
      const initialFilterModal = document.getElementById("initialFilterModal");
      const initialWorkGroupDropdown = document.getElementById("initialWorkGroupDropdown");
      const initialDesc1Dropdown = document.getElementById("initialDesc1Dropdown");
      const initialFilterConfirm = document.getElementById("initialFilterConfirm");
      const initialFilterBack = document.getElementById("initialFilterBack");
      const initialFilterCount = document.getElementById("initialFilterCount");

      if (!wgSelectModal || !wgSelectDropdown) {
        throw new Error("Work Group selection modal controls were not found in the DOM.");
      }

      debugStep("Work group modal found");

      const wgPairs = new Map();
      fullRows.forEach(r => {
        const code = safeTrim(r["Work Group Set Code"]);
        const desc = safeTrim(r["Work Group Set Description"]);
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

      hideLoading(); // Hide loading while user selects work group
      wgSelectModal.style.display = "flex";

      debugStep("Work group modal displayed");

      const finalizeLoad = (rows) => {
        showLoading("Loading Calendar", `Rendering ${rows.length.toLocaleString()} MSTs`, "Validating data...");
        updateLoadingProgress(70, "Running error checks...");

        const annotatedRows = reapplyErrorEvaluation(rows);

        debugStep("Error flags applied");
        updateLoadingProgress(75, "Building filter options...");

        populateUnique(document.getElementById("filterWorkGroup"),  annotatedRows, "Work Group Code");
        populateUnique(document.getElementById("filterJobDesc"),    annotatedRows, "Job Description Code");
        populateUnique(document.getElementById("filterDesc1"),      annotatedRows, "MST Description 1");
        populateUnique(document.getElementById("filterDesc2"),      annotatedRows, "MST Description 2");
        populateUnique(document.getElementById("filterProtType"),   annotatedRows, "Protection Type Code");
        populateUnique(document.getElementById("filterProtMethod"), annotatedRows, "Protection Method Code");
        populateUnique(document.getElementById("filterEquipDesc1"), annotatedRows, "Equipment Description 1");
        populateUnique(document.getElementById("filterElr"),        annotatedRows, "ELR");
        populateUnique(document.getElementById("filterTrackId"),    annotatedRows, "Track ID");

        debugStep("Filter dropdowns populated");
        updateLoadingProgress(80, "Indexing equipment numbers...");

        // Keep the equipment number pool unfiltered so description lookups work for
        // any record contained in the original download
        window.allEquipNumbers = [...new Set(
          (window.fullDownloadRows || []).map(r => safeTrim(r["Equipment Number"]))
        )];

        debugStep("Equipment numbers cached");

        lockDataSourceControl();

        debugStep("Data source control locked");
        updateLoadingProgress(85, "Rendering calendar events...");

        try {
          debugStep("Requesting MST render");
          MST.Editor.loadMSTs(annotatedRows);
          if (pendingSessionPayload) {
            const payloadToApply = pendingSessionPayload;
            pendingSessionPayload = null;
            applySessionPayload(payloadToApply);
          }
          debugStep("MST render requested successfully");
          updateLoadingProgress(100, "Complete!");
          setTimeout(hideLoading, 300);
        } catch (err) {
          console.error("❌ Failed to render MSTs", err);
          hideLoading();
          alert("The MSTs could not be displayed. Please retry or contact support.");
        }
      };

      const buildDesc1Options = (rows) => {
        const desc1Counts = new Map();
        const desc1StdJobs = new Map();

        rows.forEach(row => {
          const desc1 = safeTrim(row["MST Description 1"]);
          if (!desc1) return;

          desc1Counts.set(desc1, (desc1Counts.get(desc1) || 0) + 1);

          const stdJob = safeTrim(row["Std Job No"] || row["Standard Job Number"]);
          if (stdJob) {
            if (!desc1StdJobs.has(desc1)) {
              desc1StdJobs.set(desc1, new Set());
            }
            desc1StdJobs.get(desc1).add(stdJob);
          }
        });

        return [...desc1Counts.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([desc1, count]) => {
            const stdJobs = desc1StdJobs.get(desc1);
            const stdJobLabel = stdJobs && stdJobs.size
              ? ` — ${[...stdJobs].sort((a, b) => a.localeCompare(b)).join(", ")}`
              : "";

            return {
              value: desc1,
              label: `${desc1}${stdJobLabel} (${count})`
            };
          });
      };

      const buildInitialFilterOptions = (rows) => {
        if (!initialWorkGroupDropdown || !initialDesc1Dropdown) return;

        const workGroupPairs = new Map();
        rows.forEach(row => {
          const code = safeTrim(row["Work Group Code"]);
          if (!code) return;
          const desc = safeTrim(row["Work Group Description"]);
          if (!workGroupPairs.has(code)) {
            workGroupPairs.set(code, desc);
          }
        });

        const workGroupOptions = [...workGroupPairs.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([code, desc]) => ({
            value: code,
            label: desc ? `${code} — ${desc}` : code
          }));

        initialWorkGroupDropdown.innerHTML = "";
        workGroupOptions.forEach(({ value, label }) => {
          const opt = document.createElement("option");
          opt.value = value;
          opt.textContent = label;
          initialWorkGroupDropdown.appendChild(opt);
        });

        const desc1Options = buildDesc1Options(rows);

        initialDesc1Dropdown.innerHTML = "";
        desc1Options.forEach(({ value, label }) => {
          const opt = document.createElement("option");
          opt.value = value;
          opt.textContent = label;
          initialDesc1Dropdown.appendChild(opt);
        });
      };

      const openInitialFilterModal = (rows) => {
        if (!initialFilterModal || !initialFilterConfirm || !initialWorkGroupDropdown || !initialDesc1Dropdown) {
          alert("This file contains more than 6000 MSTs. Please reduce the Work Group Set selection and retry.");
          return;
        }

        buildInitialFilterOptions(rows);

        if (initialFilterCount) {
          initialFilterCount.textContent = `This selection contains ${rows.length} MSTs. Please choose Work Group codes (with descriptions) and one additional filter to continue.`;
        }

        initialWorkGroupDropdown.selectedIndex = -1;
        initialDesc1Dropdown.selectedIndex = -1;

        initialFilterModal.style.display = "flex";

        const updateDesc1Options = () => {
          const selectedWorkGroups = [...initialWorkGroupDropdown.selectedOptions].map(o => o.value);
          const baseRows = selectedWorkGroups.length
            ? rows.filter(r => selectedWorkGroups.includes(safeTrim(r["Work Group Code"])))
            : rows;
          const desc1Options = buildDesc1Options(baseRows);

          initialDesc1Dropdown.innerHTML = "";
          desc1Options.forEach(({ value, label }) => {
            const opt = document.createElement("option");
            opt.value = value;
            opt.textContent = label;
            initialDesc1Dropdown.appendChild(opt);
          });
        };

        const updateFilteredCount = () => {
          const selectedWorkGroups = [...initialWorkGroupDropdown.selectedOptions].map(o => o.value);
          const selectedDesc1 = [...initialDesc1Dropdown.selectedOptions].map(o => o.value);

          const filteredByWg = selectedWorkGroups.length
            ? rows.filter(r => selectedWorkGroups.includes(safeTrim(r["Work Group Code"])))
            : rows;

          const filtered = selectedDesc1.length
            ? filteredByWg.filter(r => selectedDesc1.includes(safeTrim(r["MST Description 1"])))
            : filteredByWg;

          if (initialFilterCount) {
            initialFilterCount.textContent = `Current selection would load ${filtered.length} MSTs. You must be at or under ${INITIAL_LOAD_THRESHOLD}.`;
          }

          initialFilterConfirm.disabled = !selectedWorkGroups.length ||
            !selectedDesc1.length ||
            filtered.length > INITIAL_LOAD_THRESHOLD;
        };

        initialWorkGroupDropdown.onchange = () => {
          updateDesc1Options();
          updateFilteredCount();
        };
        initialDesc1Dropdown.onchange = updateFilteredCount;

        updateDesc1Options();
        updateFilteredCount();

        if (initialFilterBack) {
          initialFilterBack.onclick = () => {
            initialFilterModal.style.display = "none";
            wgSelectModal.style.display = "flex";
          };
        }

        initialFilterConfirm.onclick = () => {
          const selectedWorkGroups = [...initialWorkGroupDropdown.selectedOptions].map(o => o.value);
          const selectedDesc1 = [...initialDesc1Dropdown.selectedOptions].map(o => o.value);

          if (!selectedWorkGroups.length) {
            alert("Please select at least one Work Group Code.");
            return;
          }

          if (!selectedDesc1.length) {
            alert("Please select at least one MST Description 1.");
            return;
          }

          const filteredByWg = rows.filter(r =>
            selectedWorkGroups.includes(safeTrim(r["Work Group Code"]))
          );

          const filtered = filteredByWg.filter(r =>
            selectedDesc1.includes(safeTrim(r["MST Description 1"]))
          );

          if (filtered.length > INITIAL_LOAD_THRESHOLD) {
            alert(`Please narrow the MST Description 1 selections to ${INITIAL_LOAD_THRESHOLD} or fewer MSTs.`);
            updateFilteredCount();
            return;
          }

          initialFilterModal.style.display = "none";

          if (!filtered.length) {
            alert("No MSTs matched those filters. Please try again.");
            openInitialFilterModal(rows);
            return;
          }

          finalizeLoad(filtered);
        };
      };

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

        if (wgUseAdditionalFilters?.checked) {
          debugStep("Initial filter opened by user selection");
          openInitialFilterModal(filtered);
          return;
        }

        if (filtered.length > INITIAL_LOAD_THRESHOLD) {
          debugStep("Initial filter required due to large MST count");
          openInitialFilterModal(filtered);
          return;
        }

        finalizeLoad(filtered);
      };

    } catch (err) {
      console.error(err);
      const msg = err?.message || "Failed to read MST file. Check formatting.";
      hideLoading();
      alert(msg);
    }
  }

  continueBatchBtn?.addEventListener("click", () => {
    previousBatchInput?.click();
  });

  previousBatchInput?.addEventListener("change", e => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(ev) {
      handleSessionWorkbook(ev.target.result);
      if (previousBatchInput) previousBatchInput.value = "";
    };
    reader.readAsBinaryString(file);
  });

  resumeBatchCancel?.addEventListener("click", () => {
    pendingSessionPayload = null;
    hideResumeModal();
  });

  resumeBatchUpload?.addEventListener("click", () => {
    hideResumeModal();
    fileInput?.click();
  });

  fileInput.addEventListener("change", e => {
    debugStep("File change event fired");

    const file = e.target.files[0];
    if (!file) return;

    showLoading("Reading File", "Processing " + file.name, "Parsing Excel data...");
    updateLoadingProgress(10, "Reading file contents...");

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
        hideLoading();
        alert(msg);
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
