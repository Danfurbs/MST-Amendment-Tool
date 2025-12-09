/* ===========================================================
   MST EDITOR + CALENDAR LOGIC (Namespaced)
   Depends on: MST.Utils
   =========================================================== */
const U = MST.Utils;

window.MST = window.MST || {};
window.MST.Editor = window.MST.Editor || {};
window.MST.Resources = window.MST.Resources || {};

const triggerResourceChartRefresh = () => {
  if (typeof MST?.Resources?.refreshChart === "function") {
    MST.Resources.refreshChart();
  }
};

// Calculate and display the next scheduled date from Last Scheduled Date + Frequency
window.MST.Editor.refreshNextScheduledDisplay = function() {
  if (!window.lastDateInput || !window.freqInput || !window.nextDateCalc) return;

  const last = window.lastDateInput.value;
  const freq = parseInt(window.freqInput.value || "0", 10);

  if (!last || !freq) {
    window.nextDateCalc.value = "";
    return;
  }

  const [y, m, d] = last.split("-");
  const base = new Date(+y, +m - 1, +d);
  base.setHours(9, 0, 0, 0);

  const next = U.addDays(base, freq);
  next.setHours(9, 0, 0, 0);

  window.nextDateCalc.value = U.dateToInputYYYYMMDD(next);
};

// Ensure original MST data is preserved for revert/compare
window.MST.Editor.ensureOriginalPropsStored = function(mstId, row) {
  if (!window.originalProps) window.originalProps = {};
  if (!mstId) {
    console.warn("❌ Missing mstId when storing original props:", row);
    return;
  }
if (!window.originalProps[mstId]) {
  let clone;

  try {
    clone = typeof structuredClone === "function"
      ? structuredClone(row)
      : JSON.parse(JSON.stringify(row));
  } catch (err) {
    console.error("❌ Failed to clone MST row", mstId, err);
    return;
  }

  clone["MST Description 2"] = (clone["MST Description 2"] || "").trimEnd();
  window.originalProps[mstId] = clone;
}

};

// Highlight a day yellow for ~3 seconds
window.MST.Editor.highlightDay = function(date) {
  if (!window.calendar) return;

  const highlight = window.calendar.addEvent({
    start: date,
    display: "background",
    backgroundColor: "yellow",
    id: "goto_highlight"
  });

  setTimeout(() => {
    const ev = window.calendar.getEventById("goto_highlight");
    if (ev) ev.remove();
  }, 3000);
};

// Reset all edits and reload the original dataset
window.MST.Editor.resetAllChanges = function() {
  const ok = confirm("Are you sure you want to reset all changes and reload the original MST data?");
  if (!ok) return;

  MST.Editor.loadMSTs(window.originalRows || []);
  if (window.detailsIntro) window.detailsIntro.style.display = "block";
  if (window.editForm) window.editForm.style.display = "none";
};


// =============================================
// NEW MST MODAL LOGIC (with Std Job auto-fill)
// =============================================
window.MST.Editor.openNewMSTModal = function () {
  const modal = document.getElementById("newMSTModal");
  if (!modal) return;

  modal.style.display = "flex";
  modal.style.pointerEvents = "auto";

  const jobSel        = document.getElementById("newJobCode");
  const protTypeSel   = document.getElementById("newProtType");
  const protMethodSel = document.getElementById("newProtMethod");

  // Rebuild dropdowns each time modal opens
  if (jobSel) {
    jobSel.innerHTML = '<option value="">Select.</option>';
    (window.MST_VARIABLES?.jobDescCodes || []).forEach(jd => {
      const opt = document.createElement("option");
      opt.value = jd.code;
      opt.textContent = `${jd.code} — ${jd.desc}`;
      jobSel.appendChild(opt);
    });
  }

  if (protTypeSel) {
    protTypeSel.innerHTML = '<option value="">Select.</option>';
    (window.MST_VARIABLES?.protectionTypes || []).forEach(pt => {
      const opt = document.createElement("option");
      opt.value = pt.code;
      opt.textContent = `${pt.code} — ${pt.desc}`;
      protTypeSel.appendChild(opt);
    });
  }

  if (protMethodSel) {
    protMethodSel.innerHTML = '<option value="">Select.</option>';
    (window.MST_VARIABLES?.protectionMethods || []).forEach(pm => {
      const opt = document.createElement("option");
      opt.value = pm.code;
      opt.textContent = `${pm.code} — ${pm.desc}`;
      protMethodSel.appendChild(opt);
    });
  }

  // ---- Standard Job → Desc1 + UOM auto-fill ----
  const stdJobInput = document.getElementById("newStdJobNo");
  const desc1Input  = document.getElementById("newDesc1");
  const uomInput    = document.getElementById("newUnitMeasure");

  if (stdJobInput && desc1Input && uomInput) {
    const updateFromStdJob = () => {
      const code = stdJobInput.value.trim();
      const jobDef = window.STANDARD_JOBS?.[code];

      if (jobDef) {
        desc1Input.value = jobDef.desc1 || "";
        uomInput.value   = jobDef.uom   || "";
      } else {
        // Clear if no match so user sees it's not a valid Std Job No
        desc1Input.value = "";
        uomInput.value   = "";
      }
    };

    // Bind only once per page load
    if (!stdJobInput.dataset.stdJobBound) {
      stdJobInput.addEventListener("input", updateFromStdJob);
      stdJobInput.addEventListener("blur", updateFromStdJob);
      stdJobInput.dataset.stdJobBound = "true";
    }

    // If the field is prefilled, initialise values
    updateFromStdJob();
  }

  // ---- Equipment Number → Equipment Description display ----
  const equipInput = document.getElementById("newEquipNo");
  const equipDesc  = document.getElementById("newEquipDesc");

  if (equipInput && equipDesc) {
    const updateEquipDesc = () => {
      const code = equipInput.value.trim();
      const map  = window.equipmentDescriptions;

      if (!code || !map?.get) {
        equipDesc.textContent = "";
        return;
      }

      equipDesc.textContent = map.get(code) || "";
    };

    if (!equipInput.dataset.equipDescBound) {
      equipInput.addEventListener("input", updateEquipDesc);
      equipInput.addEventListener("blur", updateEquipDesc);
      equipInput.dataset.equipDescBound = "true";
    }

    updateEquipDesc();
  }
};

// Close and reset the New MST modal
window.MST.Editor.closeNewMSTModal = function () {
  const modal = document.getElementById("newMSTModal");
  if (modal) {
    modal.style.display = "none";
    modal.style.pointerEvents = "none";
  }

  const form = document.getElementById("newMSTForm");
  if (form) {
    form.querySelectorAll("input, select").forEach(el => {
      if (el.tagName === "SELECT") {
        el.selectedIndex = 0;
      } else {
        el.value = "";
      }
    });
  }

  const equipDesc = document.getElementById("newEquipDesc");
  if (equipDesc) equipDesc.textContent = "";
};



(function() {

  const U = window.MST.Utils;
  const E = window.MST.Editor;

  const formatMileageValue = (val) => {
    if (val === null || val === undefined) return "";
    const num = parseFloat(val);
    if (Number.isNaN(num)) return "";
    return num.toFixed(4);
  };
  
    document.addEventListener('DOMContentLoaded', function () {

    /******************************************************************
     * DOM ELEMENTS
     ******************************************************************/
    const calEl           = document.getElementById('calendarEl');
	  if (!calEl) {
    console.error("❌ #calendar element not found");
    return;
  }
  
    const fileInput       = document.getElementById('fileInput');
    const exportBtn       = document.getElementById('exportBtn');
    const resetAllBtn     = document.getElementById('resetAllBtn');
    const changeCount     = document.getElementById('changeCount');
    const loading         = document.getElementById('loading');
    window.detailsIntro   = document.getElementById('detailsIntro');
    window.editForm       = document.getElementById('editForm');

    const equipDisplay    = document.getElementById('equipDisplay');
    const taskDisplay     = document.getElementById('taskDisplay');
    const mstIdDisplay    = document.getElementById('mstIdDisplay');
    const desc1Display    = document.getElementById('desc1Display');
const nextDateCalc = document.getElementById('nextDateCalc');
window.nextDateCalc = nextDateCalc;

    const lastDateInput   = document.getElementById('lastDateInput');
	const lastDatePerf   = document.getElementById('lastDatePerf');
    const freqInput       = document.getElementById('freqInput');
    const desc2Input      = document.getElementById('desc2Input');
    const wgInput         = document.getElementById('wgInput');
    const jobDescCodeInput= document.getElementById('jobDescCodeInput');
    const unitsRequiredInput = document.getElementById('unitsRequiredInput');
    const unitsRequiredLabel = document.getElementById('unitsRequiredLabel');
    const mileageFromInput   = document.getElementById('mileageFromInput');
    const mileageToInput     = document.getElementById('mileageToInput');
    const protTypeInput      = document.getElementById('protTypeInput');
    const protMethodInput    = document.getElementById('protMethodInput');

    const saveBtn         = document.getElementById('saveBtn');
    const revertBtn       = document.getElementById('revertBtn');

    // Filter DOM
    const filterOverlay   = document.getElementById('filterOverlay');
    const closeFilterBtn  = document.getElementById('closeFilterBtn');
    const openFilterBtn   = document.getElementById('openFilterBtn');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const filterWorkGroup = document.getElementById('filterWorkGroup');
    const filterJobDesc   = document.getElementById('filterJobDesc');
	const filterDesc1       = document.getElementById('filterDesc1');
	const filterDesc2       = document.getElementById('filterDesc2');
	const filterProtType    = document.getElementById('filterProtType');
	const filterProtMethod  = document.getElementById('filterProtMethod');
	const filterEquipDesc1  = document.getElementById('filterEquipDesc1');

	
	//add DOMS as Global
	window.equipDisplay = equipDisplay;
window.taskDisplay = taskDisplay;
window.mstIdDisplay = mstIdDisplay;
window.desc1Display = desc1Display;
window.lastDateInput = lastDateInput;
window.lastDatePerf = lastDatePerf;
window.freqInput = freqInput;
window.desc2Input = desc2Input;
window.wgInput = wgInput;
window.jobDescCodeInput = jobDescCodeInput;
window.unitsRequiredInput = unitsRequiredInput;
window.mileageFromInput = mileageFromInput;
window.mileageToInput = mileageToInput;
window.protTypeInput = protTypeInput;
    window.protMethodInput = protMethodInput;
    window.detailsIntro = detailsIntro;
    window.editForm = editForm;
    window.changeCount = changeCount;

// ----------------------
    // HOOK EVENTS
    // ----------------------
    window.lastDateInput.addEventListener("input",  E.refreshNextScheduledDisplay);
    window.freqInput.addEventListener("input",       E.refreshNextScheduledDisplay);
    window.mileageFromInput.addEventListener("blur", () => {
      window.mileageFromInput.value = formatMileageValue(window.mileageFromInput.value);
    });
    window.mileageToInput.addEventListener("blur", () => {
      window.mileageToInput.value = formatMileageValue(window.mileageToInput.value);
    });
    if (exportBtn && MST?.Export?.exportChanges) {
      exportBtn.addEventListener("click", MST.Export.exportChanges);
    }

    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', MST.Editor.resetAllChanges);
    }

    // ----------------------
    // INITIALIZE FULLCALENDAR
    // ----------------------
    window.calendar = new FullCalendar.Calendar(calEl, {
    initialView: 'dayGridMonth',
    editable: true,
    dayMaxEventRows: 5,
    height: 'auto',
    displayEventTime: false,
    eventDisplay: 'block',

eventContent: function(arg) {
  const ev = arg.event;
  const props = ev.extendedProps;
  const equipDesc = props.equipmentDesc1 || "";
  const desc1 = props.desc1 || "";
  const desc2 = props.desc2 || "";

  const mstId = props.mstId;
  let statusIcon = "";

  if (props.isNew) {
    statusIcon = "⭐";
  } else if (typeof MST?.Editor?.hasChanged === "function" && MST.Editor.hasChanged(mstId)) {
    statusIcon = "✏️";
  }

  return {
    html: `
      <div class="event-icon">${statusIcon}</div>
      ${equipDesc ? `<div class="event-equip">${equipDesc}</div>` : ""}
      <div class="event-desc">${desc1}${desc2 ? " — " + desc2 : ""}</div>
    `
  };


    },

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek,listWeek,listYear'
    },

    views: {
      listYear: { buttonText: 'year list' },
      listWeek: { buttonText: 'week list' }
    },

    eventClick(info) {
      const ev = info.event;
      console.log("Clicked event:", ev);
      console.log("Instance value:", ev.extendedProps.instance);

      const mstId = ev.extendedProps.mstId;

      // Always edit the base (green) MST instance so edits apply to the correct row
      let targetEvent = ev;
      if (ev.extendedProps.instance !== 0) {
        const baseEvent = window.calendar?.getEventById(`${mstId}_0`);
        if (baseEvent) {
          targetEvent = baseEvent;
        } else {
          console.warn("⚠️ Base event not found for MST", mstId);
        }
      }

      if (typeof MST?.Editor?.openEditorForMST === "function") {
        MST.Editor.openEditorForMST(mstId, targetEvent);

        // Optional: scroll editor into view
        const form = document.getElementById("editForm");
        if (form) form.scrollIntoView({ behavior: "smooth" });
      } else {
        console.error("❌ MST.Editor.openEditorForMST is not defined");
      }
    },

    eventDrop(info) {
      const ev = info.event;
      if (ev.extendedProps.instance !== 0) return;
      const mstId = ev.extendedProps.mstId;

      const deltaDays = Math.round((ev.start - info.oldEvent.start) / (1000 * 60 * 60 * 24));
      const futArr = window.futureEventsMap[mstId] || [];

      futArr.forEach(futureEv => {
        const d = new Date(futureEv.start);
        d.setDate(d.getDate() + deltaDays);
		d.setHours(9,0,0,0);
        futureEv.setDates(d);
		
      });

      if (typeof MST?.Editor?.markMSTAsChanged === "function") {
        MST.Editor.markMSTAsChanged(mstId);
      }

      // If editor panel is currently showing the same MST
      if (window.mstIdDisplay && window.mstIdDisplay.value === mstId) {
        if (window.lastDateInput && typeof MST?.Utils?.dateToInputYYYYMMDD === "function") {
          window.lastDateInput.value = MST.Utils.dateToInputYYYYMMDD(ev.start);
        }

        if (typeof MST?.Editor?.refreshNextScheduledDisplay === "function") {
          MST.Editor.refreshNextScheduledDisplay();
        }
      }

      triggerResourceChartRefresh();
    }
  });

  window.calendar.render();
});




   // =============================================
   // REFRESH NEXT SCHEDULED DATE
   // =============================================
E.rebuildFutureInstances = function(mstId, baseDate, freqDays, desc1, desc2) {
  if (!window.calendar || !window.futureEventsMap) return;

  const NEXT = "#f59e0b";
  const FUTURE = "#ef4444";

  // Remove old future events
  if (window.futureEventsMap[mstId]) {
    window.futureEventsMap[mstId].forEach(e => e.remove());
  }

  // Get resource hours from the base (green) event, if any
  const baseEvent = window.calendar.getEventById(`${mstId}_0`);
  const resourceHours = baseEvent?.extendedProps?.resourceHours || 0;

  const newArr = [];

  for (let i = 1; i <= 2; i++) {
    const dt = U.addDays(baseDate, freqDays * i);
	dt.setHours(9,0,0,0);
    const color = (i === 1 ? NEXT : FUTURE);

    const ev = window.calendar.addEvent({
      id: `${mstId}_${i}`,
      title: `${desc1} — ${desc2}`,
      start: dt,
      
      backgroundColor: color,
      borderColor: color,
      classNames: ["future-event"],
      extendedProps: {
        mstId,
        instance: i,
        frequency: freqDays,
        desc1,
        desc2,
        resourceHours
      }
    });

    newArr.push(ev);
  }

  window.futureEventsMap[mstId] = newArr;
};


  /* ----------------------------------------
     OPEN MST EDITOR PANEL
     ---------------------------------------- */
  MST.Editor.openEditorForMST = function(mstId, baseEvent) {
    const isNew = !!baseEvent.extendedProps.isNew;
    const orig = isNew
      ? baseEvent.extendedProps
      : window.originalProps[mstId];

    if (!orig) return;

    const stdJobNo = (
      baseEvent.extendedProps.stdJobNo ||
      orig["Std Job No"] ||
      orig["Standard Job Number"] ||
      ""
    ).toString().trim();

    const stdJobUom = (
      baseEvent.extendedProps.stdJobUom ||
      window.STANDARD_JOBS?.[stdJobNo]?.uom ||
      baseEvent.extendedProps.unitMeasure ||
      ""
    ).toString().trim();

    if (unitsRequiredLabel) {
      unitsRequiredLabel.textContent = stdJobUom
        ? `Units Required (${stdJobUom})`
        : "Units Required";
    }

    // Reset form visually
    [
      window.equipDisplay,
      window.taskDisplay,
      window.mstIdDisplay,
      window.desc1Display,
      window.lastDateInput,
      window.lastDatePerf,
      window.freqInput,
      window.desc2Input,
      window.wgInput,
      window.jobDescCodeInput,
      window.unitsRequiredInput,
      window.mileageFromInput,
      window.mileageToInput,
      window.protTypeInput,
      window.protMethodInput
    ].forEach(input => {
      if (!input) return;
      if (input.tagName === "SELECT") {
        input.innerHTML = "";
      } else {
        input.value = "";
      }
    });

    window.detailsIntro.style.display = "none";
    window.editForm.style.display = "block";

    /* ----- READ-ONLY ----- */
    window.equipDisplay.value = isNew ? (orig.equipmentNo || "") : (orig["Equipment Number"] || "");
    window.taskDisplay.value  = isNew ? (orig.taskNo       || "") : (orig["MST Task Number"]  || "");
    window.mstIdDisplay.value = mstId;
    window.desc1Display.value = isNew ? (orig.desc1        || "") : (orig["MST Description 1"] || "");

    // Last performed date
    const rawLPD = orig["Last Performed Date"];
    let lpdObj = null;

    if (/^\d{8}$/.test(rawLPD)) {
      lpdObj = U.yyyymmddToDate(rawLPD);
    } else {
      lpdObj = new Date(rawLPD);
    }

    window.lastDatePerf.value = U.dateToInputYYYYMMDD(lpdObj) || "";

    /* ----- EDITABLE FIELDS ----- */
    window.lastDateInput.value = U.dateToInputYYYYMMDD(baseEvent.start) || "";
    window.freqInput.value = baseEvent.extendedProps.frequency || orig["MST Frequency"] || 0;
	
    window.desc2Input.value =
  (baseEvent.extendedProps.desc2 ||
   orig["MST Description 2"] ||
   "").trimEnd();

    window.wgInput.value = baseEvent.extendedProps.workGroup || orig["Work Group Code"] || "";
    window.unitsRequiredInput.value = baseEvent.extendedProps.unitsRequired || orig["Units Required"] || "";
    const segFromVal = baseEvent.extendedProps.segFrom ?? orig["MST Segment Mileage From"] ?? "";
    const segToVal   = baseEvent.extendedProps.segTo   ?? orig["MST Segment Mileage To"]   ?? "";

    window.mileageFromInput.value = formatMileageValue(segFromVal);
    window.mileageToInput.value   = formatMileageValue(segToVal);

    /* --- Dropdowns: Job, ProtType, ProtMethod --- */
    const JD = window.MST_VARIABLES?.jobDescCodes || [];
    const PT = window.MST_VARIABLES?.protectionTypes || [];
    const PM = window.MST_VARIABLES?.protectionMethods || [];

    const jdSelect = window.jobDescCodeInput;
    jdSelect.innerHTML = "";
    jdSelect.appendChild(new Option("", "", true, false));

    const currentJD =
      baseEvent.extendedProps.jobDescCode ||
      orig["Job Description Code"] ||
      orig.jobDescCode || "";

    JD.forEach(j => {
      const opt = document.createElement("option");
      opt.value = j.code;
      opt.textContent = `${j.code} — ${j.desc}`;
      if (j.code === currentJD) opt.selected = true;
      jdSelect.appendChild(opt);
    });

    if (![...jdSelect.options].some(o => o.value === currentJD)) {
      jdSelect.value = "";
    }

    /* Protection Type */
    const ptSelect = window.protTypeInput;
    ptSelect.innerHTML = "";
    const currentPT =
      (baseEvent.extendedProps.protType ||
       orig["Protection Type Code"] ||
       orig.protType || "").toString().padStart(2,"0");

    PT.forEach(pt => {
      const opt = document.createElement("option");
      opt.value = pt.code;
      opt.textContent = pt.desc;
      if (pt.code === currentPT) opt.selected = true;
      ptSelect.appendChild(opt);
    });

    /* Protection Method */
    const pmSelect = window.protMethodInput;
    pmSelect.innerHTML = "";
    const currentPM =
      (baseEvent.extendedProps.protMethod ||
       orig["Protection Method Code"] ||
       orig.protMethod || "").toString().padStart(2,"0");

    PM.forEach(pm => {
      const opt = document.createElement("option");
      opt.value = pm.code;
      opt.textContent = pm.desc;
      if (pm.code === currentPM) opt.selected = true;
      pmSelect.appendChild(opt);
    });

    if (typeof MST?.Editor?.refreshNextScheduledDisplay === "function") {
      MST.Editor.refreshNextScheduledDisplay();
    }

    /* Buttons */
    window.saveBtn.onclick = () => MST.Editor.saveMSTEdits(mstId);
    window.revertBtn.onclick = () => MST.Editor.revertMST(mstId);
    window.deactivateBtn.onclick = () => MST.Editor.deactivateMST(mstId);
  };

  /* ----------------------------------------
     MARK MSTs AS CHANGED
     ---------------------------------------- */

  /* ----------------------------------------
     LOAD MSTs
     ---------------------------------------- */

 MST.Editor.loadMSTs = function(rows) {
  // Clear state
  window.changes = {};
  if (window.changeCount) window.changeCount.innerText = "";
  window.futureEventsMap = {};
  window.originalProps = {};

  if (!window.calendar) return;
  if (window.loading) window.loading.style.display = "block";

  window.calendar.batchRendering(() => {
    window.calendar.getEvents().forEach(e => e.remove());

    rows.forEach(r => {
      let mstId = (r["CONCAT"] || "").toString().trim();

      if (!mstId) {
        const eq = (r["Equipment Number"] || "").trim();
        const tn = (r["MST Task Number"] || "").toString().padStart(3, "0");
        if (eq && tn) {
          mstId = `${eq}_${tn}`;
          console.warn(`⚠️ Fallback mstId generated: ${mstId}`);
        } else {
          console.error("❌ Skipping MST row due to missing MST ID (CONCAT or fallback):", r);
          return;
        }
      }

      const freq = parseInt(r["MST Frequency"]) || 0;
      const rawLastDate = (r["Last Scheduled Date"] || "").toString().trim();
      const stdJobNo = (
        r["Std Job No"] ||
        r["Standard Job Number"] ||
        ""
      ).toString().trim();
      const stdJobUom = (
        window.STANDARD_JOBS?.[stdJobNo]?.uom ||
        ""
      ).toString().trim();
      if (!/^[0-9]{8}$/.test(rawLastDate)) return;

      const baseDate = MST.Utils.yyyymmddToDate(rawLastDate);
      if (!baseDate) return;

      // Force consistent 09:00 time to avoid DST shifts
      const eventStart = new Date(baseDate);
      eventStart.setHours(9, 0, 0, 0);

      if (typeof MST.Editor.ensureOriginalPropsStored === "function") {
        MST.Editor.ensureOriginalPropsStored(mstId, r);
      }

      window.calendar.addEvent({
        id: `${mstId}_0`,
        title: `${r["MST Description 1"] || ""} — ${r["MST Description 2"] || ""}`,
        start: eventStart,     // ← Correct placement
        allDay: false,         // ← Prevent DST-shifting behaviour
        backgroundColor: MST.Utils.BASE_COLOR,
        borderColor: MST.Utils.BASE_COLOR,
        extendedProps: {
          mstId,
          instance: 0,
          frequency: freq,
          desc1: r["MST Description 1"] || "",
          desc2: (r["MST Description 2"] || "").trimEnd(),
          equipmentNo: r["Equipment Number"] || "",
          taskNo: r["MST Task Number"] || "",
          stdJobNo,
          stdJobUom,
          unitMeasure: stdJobUom,
          equipmentDesc1: r["Equipment Description 1"] || "",
          workGroup: r["Work Group Code"] || "",
          jobDescCode: r["Job Description Code"] || "",
          unitsRequired: r["Units Required"] || "",
    segFrom: r["MST Segment Mileage From"] || "",
    segTo: r["MST Segment Mileage To"] || "",
    protType: r["Protection Type Code"] || "",
    protMethod: r["Protection Method Code"] || "",
    resourceHours: parseFloat(r["Resource Hours"] || 0)
  }
});


      if (typeof MST.Editor.rebuildFutureInstances === "function") {
        MST.Editor.rebuildFutureInstances(
          mstId,
          baseDate,
          freq,
          r["MST Description 1"] || "",
          r["MST Description 2"] || ""
        );
      }
    });
  });

  if (window.loading) window.loading.style.display = "none";
};


  /* ----------------------------------------
     SAVE MST EDITS
     ---------------------------------------- */
  MST.Editor.saveMSTEdits = function(mstId) {
  const baseEvent = window.calendar.getEventById(`${mstId}_0`);
  if (!baseEvent) return;

  const props = baseEvent.extendedProps;
  const isNew = props.isNew === true;

  const newDateStr = window.lastDateInput.value;           // yyyy-mm-dd
  const freq       = parseInt(window.freqInput.value || "0", 10);

  // Update props
  const formattedSegFrom = formatMileageValue(window.mileageFromInput.value);
  const formattedSegTo   = formatMileageValue(window.mileageToInput.value);

  window.mileageFromInput.value = formattedSegFrom;
  window.mileageToInput.value   = formattedSegTo;

  baseEvent.setExtendedProp("frequency", freq);
  baseEvent.setExtendedProp("desc2", window.desc2Input.value.trimEnd());
  baseEvent.setExtendedProp("workGroup", window.wgInput.value.trim());
  baseEvent.setExtendedProp("jobDescCode", window.jobDescCodeInput.value.trim());
  baseEvent.setExtendedProp("unitsRequired", window.unitsRequiredInput.value);
  baseEvent.setExtendedProp("segFrom", formattedSegFrom);
  baseEvent.setExtendedProp("segTo", formattedSegTo);
  baseEvent.setExtendedProp("protType", window.protTypeInput.value.trim());
  baseEvent.setExtendedProp("protMethod", window.protMethodInput.value.trim());

  // Date update
  let newBase = baseEvent.start;
  if (newDateStr) {
    const [y, m, d] = newDateStr.split("-");
    newBase = new Date(+y, +m - 1, +d);
	newBase.setHours(9,0,0,0);
    baseEvent.setDates(newBase);
  }

  // Rebuild amber/red
  MST.Editor.rebuildFutureInstances(
    mstId,
    newBase,
    freq,
    baseEvent.extendedProps.desc1,
    baseEvent.extendedProps.desc2
  );

  triggerResourceChartRefresh();

  // Update created MST or mark changed
  if (isNew && window.createdMSTs?.[mstId]) {
    Object.assign(window.createdMSTs[mstId], {
      "Freq": freq,
      "MST Desc 2": window.desc2Input.value.trim(),
      "Job Desc Code": window.jobDescCodeInput.value.trim(),
      "Work Group": window.wgInput.value.trim(),
      "Unit Required": window.unitsRequiredInput.value,
      "Segment From": formattedSegFrom,
      "Segment To": formattedSegTo,
      "ProtectionType": window.protTypeInput.value.trim(),
      "ProtectionMethod": window.protMethodInput.value.trim(),
      "LSD": newDateStr
    });
  } else {
    E.markMSTAsChanged(mstId);
  }

  if (typeof window.MST?.ErrorUI?.recheckSingleMst === "function") {
    window.MST.ErrorUI.recheckSingleMst(mstId);
  }

  alert("Saved MST: " + mstId);
};


  /* ----------------------------------------
     REVERT MST
     ---------------------------------------- */
  MST.Editor.revertMST = function(mstId) {
    const orig = window.originalProps[mstId];
    if (!orig) return;

    // Remove all existing events for MST
    window.calendar.getEvents()
      .filter(ev => ev.extendedProps.mstId === mstId)
      .forEach(ev => ev.remove());

    const freq = parseInt(orig["MST Frequency"]) || 0;
    const rawLast = String(orig["Last Scheduled Date"] || "");
    const baseDate = U.yyyymmddToDate(rawLast);
	baseDate.setHours(9,0,0,0);
    if (!baseDate) return;

    // Base green
    const baseEvent = window.calendar.addEvent({
      id: `${mstId}_0`,
      title: `${orig["MST Description 1"] || ""} — ${orig["MST Description 2"] || ""}`,
      start: baseDate,
   
      backgroundColor: U.BASE_COLOR,
      borderColor: U.BASE_COLOR,
      extendedProps: {
        mstId,
        instance: 0,
        frequency: freq,
        desc1: orig["MST Description 1"] || "",
        desc2: orig["MST Description 2"] || "",
        workGroup: orig["Work Group Code"] || "",
        jobDescCode: orig["Job Description Code"] || "",
        unitsRequired: orig["Units Required"] || "",
        segFrom: orig["MST Segment Mileage From"] || "",
        segTo: orig["MST Segment Mileage To"] || "",
        protType: orig["Protection Type Code"] || "",
        protMethod: orig["Protection Method Code"] || ""
      }
    });

    MST.Editor.rebuildFutureInstances(
      mstId,
      baseDate,
      freq,
      orig["MST Description 1"] || "",
      orig["MST Description 2"] || ""
    );

    delete window.changes[mstId];
    window.changeCount.innerText = `Changes: ${Object.keys(window.changes).length}`;

    E.openEditorForMST(mstId, baseEvent);

    alert("Reverted MST: " + mstId);
  };

  /* ----------------------------------------
     DEACTIVATE MST
     ---------------------------------------- */
  MST.Editor.deactivateMST = function(mstId) {
    if (!confirm("Deactivate this MST?")) return;

    const baseEvent = window.calendar.getEventById(`${mstId}_0`);
    if (!baseEvent) return;

    const orig = window.originalProps[mstId];
    const props = baseEvent.extendedProps;

    props.workGroup = "DNXXXXX";
    props.schedIndicator = "9";
    baseEvent.setProp("backgroundColor", "#000");
    baseEvent.setProp("borderColor", "#000");
    baseEvent.setProp("textColor", "#fff");
    baseEvent.setProp("classNames", ["deactivated-mst"]);

    // Add to changes if not already
    if (!window.changes[mstId]) {
      window.changes[mstId] = {
        MST_ID: mstId,
        Equipment: orig["Equipment Number"] || props.equipmentNo || "",
        "Task No": orig["MST Task Number"] || props.taskNo || "",
        "MST Desc 1": orig["MST Description 1"] || props.desc1 || "",
        "MST Desc 2": orig["MST Description 2"] || props.desc2 || "",
        Old_Work_Group_Code: orig["Work Group Code"] || "",
        New_Work_Group_Code: "DNXXXXX",
        Old_Scheduling_Indicator_Code: orig["Scheduling Indicator Code"] || "",
        New_Scheduling_Indicator_Code: "9"
      };
    }

    window.changeCount.innerText = `Changes: ${Object.keys(window.changes).length}`;

    alert("MST deactivated.");
  };

/* ----------------------------------------
   ADD NEW MST (used by New MST modal)
---------------------------------------- */
MST.Editor.addNewMST = function () {

  const equipNo     = document.getElementById("newEquipNo").value.trim();
  const stdJobNo    = document.getElementById("newStdJobNo").value.trim();
  const stdJobUom   = (
    window.STANDARD_JOBS?.[stdJobNo]?.uom ||
    document.getElementById("newUnitMeasure").value.trim() ||
    ""
  ).toString().trim();
  const desc1       = document.getElementById("newDesc1").value.trim();
  const desc2       = document.getElementById("newDesc2").value.trim();
  const jobDescCode = document.getElementById("newJobCode").value.trim();
  const freq        = parseInt(document.getElementById("newFreq").value.trim(), 10);
  const lastDateStr = document.getElementById("newLastDate").value;
  const unitsReq    = document.getElementById("newUnits").value.trim();
  const protType    = document.getElementById("newProtType").value.trim();
  const protMethod  = document.getElementById("newProtMethod").value.trim();
  const wgCode      = document.getElementById("newWorkGroup").value.trim();

  // Validation
  if (!equipNo || !stdJobNo || !desc1 || !jobDescCode ||
      !freq || !lastDateStr || !unitsReq || !protType || !protMethod) {
    alert("Please complete all mandatory fields marked with *.");
    return;
  }

  const lastDate = new Date(lastDateStr);
  lastDate.setHours(9,0,0,0);
  const mstId = `${equipNo}_${stdJobNo}`;

  // Add base event (GREEN)
  const baseEvent = window.calendar.addEvent({
    id: `${mstId}_0`,
    title: `${equipNo} — ${desc1}`,
    start: lastDate,
  
    backgroundColor: "#10b981",
    borderColor: "#10b981",
    extendedProps: {
      mstId,
      equipmentNo: equipNo,
      taskNo: "",
      stdJobNo,
      desc1,
      desc2,
      frequency: freq,
      workGroup: wgCode,
      jobDescCode,
      unitsRequired: unitsReq,
      stdJobUom,
      segFrom: document.getElementById("newFrom").value.trim(),
      segTo: document.getElementById("newTo").value.trim(),
      protType,
      protMethod,
      unitMeasure: stdJobUom,
      instance: 0,
      isNew: true
    }
  });

  // Build amber + red future instances
  if (typeof E.rebuildFutureInstances === "function") {
    E.rebuildFutureInstances(
      mstId,
      lastDate,
      freq,
      desc1,
      desc2
    );
  }

  // Track newly created MSTs for export
  if (!window.createdMSTs) window.createdMSTs = {};
  window.createdMSTs[mstId] = {
    "Equipment": equipNo,
    "Task No": "",
    "Comp Code": "",
    "Mod Code": "",
    "Job Desc Code": jobDescCode,
    "MST Type": "",
    "StatutoryMST": "",
    "Allow Multiple workorders": "",
    "MST Desc 1": desc1,
    "MST Desc 2": desc2,
    "Freq": freq,
    "Unit Required": unitsReq,
    "Unit of Work": document.getElementById("newUnitMeasure").value.trim(),
    "Sched Ind": "1",
    "Work Group": wgCode,
    "Std Job No": stdJobNo,
    "LPD": "",
    "LSD": lastDateStr,
    "NSD": "",
    "Segment From": document.getElementById("newFrom").value.trim(),
    "Segment To": document.getElementById("newTo").value.trim(),
    "Segment UOM": "",
    "Assign To": "",
    "ProtectionType": protType,
    "ProtectionMethod": protMethod,
    "TV Reference": "",
    "TV Expiry Date": ""
  };

  // Close modal
  MST.Editor.closeNewMSTModal();

  // Immediately open the editor
  MST.Editor.openEditorForMST(mstId, baseEvent);
};

  /* ----------------------------------------
     CHANGE DETECTION
     ---------------------------------------- */
  MST.Editor.buildChangeExportRow = function(mstId) {
    const orig = window.originalProps[mstId];
    const baseEvent = window.calendar.getEventById(`${mstId}_0`);
    if (!orig || !baseEvent) return null;

    const cur = {
      equipmentNo: baseEvent.extendedProps.equipmentNo,
      equipmentDesc1: baseEvent.extendedProps.equipmentDesc1,
      taskNo: baseEvent.extendedProps.taskNo,
      desc1: baseEvent.extendedProps.desc1,
      freq: baseEvent.extendedProps.frequency,
      desc2: baseEvent.extendedProps.desc2,
      lastSched: U.dateToInputYYYYMMDD(baseEvent.start),
      wg: baseEvent.extendedProps.workGroup,
      job: baseEvent.extendedProps.jobDescCode,
      units: baseEvent.extendedProps.unitsRequired,
      segFrom: baseEvent.extendedProps.segFrom,
      segTo: baseEvent.extendedProps.segTo,
      pt: baseEvent.extendedProps.protType,
      pm: baseEvent.extendedProps.protMethod
    };

    const normalizedLastSched = U.normalizeDateInput(orig["Last Scheduled Date"] || "");
    const normalizedCurLastSched = U.normalizeDateInput(cur.lastSched);

    const normalizedUnitsOld = U.normalizeNumericField(orig["Units Required"] || "");
    const normalizedUnitsNew = U.normalizeNumericField(cur.units);

    const normalizedSegFromOld = U.normalizeNumericField(orig["MST Segment Mileage From"] || "");
    const normalizedSegFromNew = U.normalizeNumericField(cur.segFrom);

    const normalizedSegToOld = U.normalizeNumericField(orig["MST Segment Mileage To"] || "");
    const normalizedSegToNew = U.normalizeNumericField(cur.segTo);

    return {
      MST_ID: mstId,
      Equipment: cur.equipmentNo || orig["Equipment Number"] || "",
      Equipment_Description: cur.equipmentDesc1 || orig["Equipment Description 1"] || "",
      "Task No": cur.taskNo || orig["MST Task Number"] || "",
      MST_Description_1: cur.desc1 || orig["MST Description 1"] || "",
      "MST Desc 1": cur.desc1 || orig["MST Description 1"] || "",

      Old_Frequency: orig["MST Frequency"] || "",
      New_Frequency: cur.freq,

      Old_Desc2: (orig["MST Description 2"] || "").trimEnd(),
      New_Desc2: (cur.desc2 || "").trimEnd(),


      Old_Last_Scheduled_Date: normalizedLastSched,
      New_Last_Scheduled_Date: normalizedCurLastSched,

      Old_Work_Group_Code: orig["Work Group Code"] || "",
      New_Work_Group_Code: cur.wg,

      Old_Job_Desc_Code: orig["Job Description Code"] || "",
      New_Job_Desc_Code: cur.job,

      Old_Units_Required: normalizedUnitsOld,
      New_Units_Required: normalizedUnitsNew,

      Old_Segment_From: normalizedSegFromOld,
      New_Segment_From: normalizedSegFromNew,

      Old_Segment_To: normalizedSegToOld,
      New_Segment_To: normalizedSegToNew,

      Old_Protection_Type_Code: orig["Protection Type Code"] || "",
      New_Protection_Type_Code: cur.pt,

      Old_Protection_Method_Code: orig["Protection Method Code"] || "",
      New_Protection_Method_Code: cur.pm
    };
  };

  MST.Editor.markMSTAsChanged = function(mstId) {
    const row = E.buildChangeExportRow(mstId);
    if (!row) return;

    const changed =
      row.New_Frequency != row.Old_Frequency ||
      row.New_Desc2.trimEnd() !== row.Old_Desc2.trimEnd() ||
      row.New_Last_Scheduled_Date !== row.Old_Last_Scheduled_Date ||
      row.New_Work_Group_Code !== row.Old_Work_Group_Code ||
      row.New_Job_Desc_Code !== row.Old_Job_Desc_Code ||
      row.New_Units_Required != row.Old_Units_Required ||
      row.New_Segment_From != row.Old_Segment_From ||
      row.New_Segment_To != row.Old_Segment_To ||
      row.New_Protection_Type_Code !== row.Old_Protection_Type_Code ||
      row.New_Protection_Method_Code !== row.Old_Protection_Method_Code;

    if (changed) {
      window.changes[mstId] = row;
    } else {
      delete window.changes[mstId];
    }

    window.changeCount.innerText = `Changes: ${Object.keys(window.changes).length}`;

    const baseEvent = window.calendar.getEventById(`${mstId}_0`);
    if (!baseEvent) return;

    const originalTitle = baseEvent.title.replace(/\*Amended\*/gi, "").trim();

if (changed) {
  baseEvent.setProp("title", `*Amended* ${originalTitle}`);

  // Apply "changed" class without breaking FC v6
  const existing = baseEvent.classNames || [];
  if (!existing.includes("changed-mst")) {
    baseEvent.setProp("classNames", [...existing, "changed-mst"]);
  }

} else {
  baseEvent.setProp("title", originalTitle);

  // Remove the class safely
  const filtered = (baseEvent.classNames || []).filter(c => c !== "changed-mst");
  baseEvent.setProp("classNames", filtered);
}

  };

  MST.Editor.hasChanged = function(mstId) {
    if (!mstId || !window.changes) return false;
    return Boolean(window.changes[mstId]);
  };

})();


