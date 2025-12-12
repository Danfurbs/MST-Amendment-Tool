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

  // Paste the SharePoint link that provides the MST download here. The URL should
  // point directly to the file (e.g. the ".xlsx" download link). Include the
  // full https URL. Example: "https://contoso.sharepoint.com/sites/team/.../MST.xlsx"
  // The request automatically reuses the user's SharePoint session (via cookies)
  // so the signed-in user's access will be honoured as long as this page is loaded
  // over HTTP(S) from a trusted host (not file://).
  const SHAREPOINT_FILE_URL = "PUT_SHAREPOINT_LINK_HERE";

  const loadSharePointBtn = document.getElementById("loadSharePointBtn");
  const fileInputLabelText = document.querySelector(".file-upload-label-text");
  const loading   = document.getElementById("loading");
  const downloadDateDisplay = document.getElementById("downloadDateDisplay");
  const downloadDateWarning = document.getElementById("downloadDateWarning");
  const errorSummaryEl = document.getElementById("mstErrorSummary");

  // Defensive limits to avoid allocating enormous buffers that can destabilise the browser
  const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
  const MAX_ROWS = 20000;                    // Hard cap on parsed rows

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

  function debugStep(label) {
    const prefix = "[FileUpload]";
    alert(`${prefix} ${label}`);
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

  function lockDataSourceControl() {
    if (loadSharePointBtn) {
      loadSharePointBtn.disabled = true;
      loadSharePointBtn.classList.add("disabled");
      loadSharePointBtn.title = "File loaded";
    }

    if (fileInputLabelText) {
      fileInputLabelText.textContent = "\ud83d\udd12";
    }
  }

  if (!loadSharePointBtn) {
    console.error("❌ FileUpload.js: #loadSharePointBtn not found in DOM");
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

  function parseAndLoadWorkbook(rawData, workbookType) {
    debugStep("Workbook data captured");

    try {
      const workbook = XLSX.read(rawData, { type: workbookType, sheetRows: MAX_ROWS });
      debugStep("Workbook parsed");

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      debugStep("Primary sheet located");

      if (!sheet) {
        throw new Error("No sheets were found in the uploaded workbook.");
      }

      let rowCount = 0;
      if (sheet["!ref"]) {
        const range = XLSX.utils.decode_range(sheet["!ref"]);
        rowCount = range.e.r - range.s.r + 1;
      }

      debugStep("Row count calculated");

      if (rowCount > MAX_ROWS) {
        throw new Error(`Row limit exceeded (${rowCount} > ${MAX_ROWS}). The file is too large to load safely in the browser.`);
      }

      debugStep("Row count validated");

      const json = XLSX.utils.sheet_to_json(sheet, {
        sheetRows: MAX_ROWS,
        blankrows: false
      });

      debugStep("Sheet converted to JSON");

      if (json.length > MAX_ROWS) {
        throw new Error(`Row limit exceeded (${json.length} > ${MAX_ROWS}). The file is too large to load safely in the browser.`);
      }

      const fullRows = json;

      // Build equipment descriptions from the complete, unfiltered download
      window.fullDownloadRows     = fullRows;
      window.equipmentDescriptions = buildEquipmentDescMap(fullRows);

      debugStep("Master rows stored and equipment map built");

      const downloadDateRaw = fullRows[0]?.["Download Date"];
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

  async function loadFromSharePoint() {
    if (!SHAREPOINT_FILE_URL || SHAREPOINT_FILE_URL === "PUT_SHAREPOINT_LINK_HERE") {
      alert("Please set SHAREPOINT_FILE_URL in libs/FileUpload.js to your SharePoint download link.");
      return;
    }

    if (window.location.protocol === "file:") {
      alert("This page is running from a local file (origin null). Please host it on SharePoint or an intranet HTTPS site so your signed-in SharePoint session can be used without CORS errors.");
      return;
    }

    try {
      debugStep("Starting SharePoint fetch");
      if (loading) loading.style.display = "block";

      const response = await fetch(SHAREPOINT_FILE_URL, {
        credentials: "include", // reuse the logged-in user's SharePoint cookies
        mode: "cors"
      });
      if (!response.ok) {
        throw new Error(`SharePoint responded with ${response.status} ${response.statusText}`);
      }

      const contentLengthHeader = response.headers.get("content-length");
      const declaredBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : null;
      if (declaredBytes && declaredBytes > MAX_UPLOAD_BYTES) {
        throw new Error(`The SharePoint file is too large (${(declaredBytes / (1024 * 1024)).toFixed(1)} MB). Please keep downloads under ${(MAX_UPLOAD_BYTES / (1024 * 1024))} MB to avoid browser instability.`);
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_UPLOAD_BYTES) {
        throw new Error(`The SharePoint file is too large once downloaded (${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB). Please keep downloads under ${(MAX_UPLOAD_BYTES / (1024 * 1024))} MB to avoid browser instability.`);
      }

      debugStep("SharePoint file downloaded");

      await parseAndLoadWorkbook(buffer, "array");
    } catch (err) {
      console.error("❌ Failed to load SharePoint file", err);
      let msg = err?.message || "There was an error loading the SharePoint file. Please try again.";

      if (err instanceof TypeError && msg.toLowerCase().includes("fetch")) {
        msg = "Unable to reach SharePoint. Please make sure you are signed in to SharePoint in this browser and that the tool is opened over HTTP(S) (not file://).";
      }

      if (/CORS|Access-Control-Allow-Origin/i.test(msg)) {
        msg = "SharePoint blocked the request due to CORS. Host this page on SharePoint/your intranet (https) so the request shares the same origin, or ask IT to allow the origin.";
      }

      alert(msg);
    }
  }

  loadSharePointBtn.addEventListener("click", loadFromSharePoint);

  window.MST = window.MST || {};
  window.MST.ErrorUI = {
    openMstFromErrorList,
    recheckSingleMst
  };

});
