/* ===========================================================
   MST EDITOR + CALENDAR LOGIC (Namespaced)
   Depends on: MST.Utils
   =========================================================== */
const U = MST.Utils;

const MAX_DESC2_LENGTH = 45;
const clampDesc2 = (value = "") => value.toString().slice(0, MAX_DESC2_LENGTH);
const updateCharCounter = (inputEl, counterEl, max = MAX_DESC2_LENGTH) => {
  if (!inputEl || !counterEl) return;

  const currentLength = (inputEl.value || "").length;
  counterEl.textContent = `${currentLength}/${max}`;
};

const normalizeAllowMultipleFlag = (value) =>
  String(value || "").trim().toUpperCase() === "YES" ? "YES" : "";

window.MST = window.MST || {};
window.MST.Editor = window.MST.Editor || {};
window.MST.Resources = window.MST.Resources || {};

const triggerResourceChartRefresh = () => {
  if (typeof MST?.Resources?.refreshChart === "function") {
    MST.Resources.refreshChart();
  }
};

const REMOVED_TV_REFERENCE = "NULL";
const REMOVED_TV_EXPIRY = "2001-01-01";

const normalizeTvReference = (value) => (value ?? "").toString().trim();
const normalizeTvExpiry = (value) => U.normalizeDateInput(value) || "";

const isActiveTv = (reference, expiry) => {
  const ref = normalizeTvReference(reference);
  if (!ref || ref.toUpperCase() === REMOVED_TV_REFERENCE) return false;

  const normalizedExpiry = normalizeTvExpiry(expiry);
  if (normalizedExpiry && normalizedExpiry === REMOVED_TV_EXPIRY) return false;

  return true;
};

const toggleTvButtons = (hasActiveTv) => {
  if (window.applyTvBtn) window.applyTvBtn.style.display = hasActiveTv ? "none" : "inline-flex";
  if (window.editTvBtn) window.editTvBtn.style.display = hasActiveTv ? "inline-flex" : "none";
  if (window.removeTvBtn) window.removeTvBtn.style.display = hasActiveTv ? "inline-flex" : "none";
};

const resolveStdJobUom = (stdJobNo, baseEvent, orig = {}) => {
  const rawStdJobNo = (stdJobNo ?? "").toString().trim();
  const normalizedStdJobNo = rawStdJobNo.replace(/^0+/, "") || rawStdJobNo;

  const fromExtended = baseEvent?.extendedProps?.stdJobUom || baseEvent?.extendedProps?.unitMeasure;
  const fromStdJobs =
    window.STANDARD_JOBS?.[rawStdJobNo]?.uom ||
    (normalizedStdJobNo !== rawStdJobNo ? window.STANDARD_JOBS?.[normalizedStdJobNo]?.uom : "");
  const fromOriginal =
    orig["Unit of Work"] ||
    orig["Unit of work"] ||
    orig["Unit of Measure"] ||
    orig["Unit Measure"] ||
    "";

  return (fromExtended || fromStdJobs || fromOriginal || "").toString().trim();
};

const setTvControlsVisible = (visible) => {
  if (window.tvActions?.classList) {
    window.tvActions.classList.toggle("visible", !!visible);
  }

  if (!visible) {
    if (window.tvAppliedLabel?.classList) window.tvAppliedLabel.classList.remove("visible");
    toggleTvButtons(false);
    closeTvForm();
  }
};

const closeTvForm = () => {
  if (window.tvForm) window.tvForm.classList.remove("visible");
};

const applyTvStyling = (baseEvent, hasTv) => {
  if (!baseEvent) return;

  const color = hasTv ? U.TV_COLOR : U.BASE_COLOR;
  baseEvent.setProp("backgroundColor", color);
  baseEvent.setProp("borderColor", color);

  const classes = new Set(baseEvent.classNames || []);
  if (hasTv) {
    classes.add("tv-reference");
  } else {
    classes.delete("tv-reference");
  }
  baseEvent.setProp("classNames", [...classes]);

  if (window.sidebarEl?.classList) window.sidebarEl.classList.toggle("has-tv-reference", hasTv);
  if (window.editForm?.classList) window.editForm.classList.toggle("has-tv-reference", hasTv);
  if (window.tvAppliedLabel?.classList) window.tvAppliedLabel.classList.toggle("visible", hasTv);
  toggleTvButtons(hasTv);
};

const formatMileageValue = (val) => {
  if (val === null || val === undefined) return "";
  const num = parseFloat(val);
  if (Number.isNaN(num)) return "";
  return num.toFixed(4);
};

const bindDesc2Limiter = (inputEl, counterEl) => {
  if (!inputEl) return;

  const handleInput = () => {
    inputEl.value = clampDesc2(inputEl.value);
    updateCharCounter(inputEl, counterEl);
  };

  inputEl.addEventListener("input", handleInput);
  handleInput();
};

const bindMileageFormatter = (inputEl) => {
  if (!inputEl) return;

  inputEl.dataset.edited = "false";

  inputEl.addEventListener("input", () => {
    inputEl.dataset.edited = "true";
  });

  inputEl.addEventListener("blur", () => {
    inputEl.value = formatMileageValue(inputEl.value);
  });
};

const bindBatchMirroring = (primaryInput, compactInput) => {
  if (!primaryInput || !compactInput) return;

  const syncPrimaryToCompact = () => {
    compactInput.value = primaryInput.value;
  };

  const syncCompactToPrimary = () => {
    primaryInput.value = compactInput.value;
  };

  primaryInput.addEventListener("input", syncPrimaryToCompact);
  compactInput.addEventListener("input", syncCompactToPrimary);
  syncPrimaryToCompact();
};

const bindExportButton = (btn) => {
  if (btn && MST?.Export?.exportChanges) {
    btn.addEventListener("click", MST.Export.exportChanges);
  }
};

const getDomElements = () => ({
  allowMultipleInput: document.getElementById("allowMultipleInput"),
  applyFiltersBtn: document.getElementById("applyFiltersBtn"),
  applyTvBtn: document.getElementById("applyTvBtn"),
  cancelTvBtn: document.getElementById("cancelTvBtn"),
  calEl: document.getElementById("calendarEl"),
  batchNumber: document.getElementById("batchNumber"),
  batchNumberCompact: document.getElementById("batchNumberCompact"),
  changeCount: document.getElementById("changeCount"),
  closeFilterBtn: document.getElementById("closeFilterBtn"),
  deactivateBtn: document.getElementById("deactivateBtn"),
  desc1Display: document.getElementById("desc1Display"),
  desc2Counter: document.getElementById("desc2Counter"),
  desc2Input: document.getElementById("desc2Input"),
  detailsIntro: document.getElementById("detailsIntro"),
  editForm: document.getElementById("editForm"),
  editTvBtn: document.getElementById("editTvBtn"),
  equipDisplay: document.getElementById("equipDisplay"),
  exportBtn: document.getElementById("exportBtn"),
  exportBtnCompact: document.getElementById("exportBtnCompact"),
  filterDesc1: document.getElementById("filterDesc1"),
  filterDesc2: document.getElementById("filterDesc2"),
  filterEquipDesc1: document.getElementById("filterEquipDesc1"),
  filterJobDesc: document.getElementById("filterJobDesc"),
  filterOverlay: document.getElementById("filterOverlay"),
  filterProtMethod: document.getElementById("filterProtMethod"),
  filterProtType: document.getElementById("filterProtType"),
  filterWorkGroup: document.getElementById("filterWorkGroup"),
  freqInput: document.getElementById("freqInput"),
  jobDescCodeInput: document.getElementById("jobDescCodeInput"),
  lastDateInput: document.getElementById("lastDateInput"),
  lastDatePerf: document.getElementById("lastDatePerf"),
  loading: document.getElementById("loading"),
  mileageFromInput: document.getElementById("mileageFromInput"),
  mileageToInput: document.getElementById("mileageToInput"),
  mstIdDisplay: document.getElementById("mstIdDisplay"),
  newDesc2Counter: document.getElementById("newDesc2Counter"),
  newDesc2Input: document.getElementById("newDesc2"),
  nextDateCalc: document.getElementById("nextDateCalc"),
  openFilterBtn: document.getElementById("openFilterBtn"),
  protMethodInput: document.getElementById("protMethodInput"),
  protTypeInput: document.getElementById("protTypeInput"),
  removeTvBtn: document.getElementById("removeTvBtn"),
  resetAllBtn: document.getElementById("resetAllBtn"),
  resetFiltersBtn: document.getElementById("resetFiltersBtn"),
  revertBtn: document.getElementById("revertBtn"),
  saveBtn: document.getElementById("saveBtn"),
  saveTvBtn: document.getElementById("saveTvBtn"),
  sidebar: document.getElementById("sidebar"),
  taskDisplay: document.getElementById("taskDisplay"),
  tvActions: document.getElementById("tvActions"),
  tvAppliedLabel: document.getElementById("tvAppliedLabel"),
  tvExpiryInput: document.getElementById("tvExpiryInput"),
  tvForm: document.getElementById("tvForm"),
  tvReferenceInput: document.getElementById("tvReferenceInput"),
  unitsRequiredInput: document.getElementById("unitsRequiredInput"),
  unitsRequiredLabel: document.getElementById("unitsRequiredLabel"),
  wgInput: document.getElementById("wgInput"),
});

const exposeDomElements = (elements) => {
  const {
    allowMultipleInput,
    applyTvBtn,
    cancelTvBtn,
    changeCount,
    desc1Display,
    desc2Counter,
    desc2Input,
    detailsIntro,
    deactivateBtn,
    editForm,
    editTvBtn,
    equipDisplay,
    freqInput,
    jobDescCodeInput,
    lastDateInput,
    lastDatePerf,
    mileageFromInput,
    mileageToInput,
    mstIdDisplay,
    protMethodInput,
    protTypeInput,
    removeTvBtn,
    revertBtn,
    saveBtn,
    saveTvBtn,
    sidebar,
    taskDisplay,
    tvActions,
    tvAppliedLabel,
    tvExpiryInput,
    tvForm,
    tvReferenceInput,
    unitsRequiredInput,
    unitsRequiredLabel,
    wgInput,
    nextDateCalc,
    loading,
  } = elements;

  window.allowMultipleInput = allowMultipleInput;
  window.applyTvBtn = applyTvBtn;
  window.cancelTvBtn = cancelTvBtn;
  window.changeCount = changeCount;
  window.deactivateBtn = deactivateBtn;
  window.desc1Display = desc1Display;
  window.desc2Counter = desc2Counter;
  window.desc2Input = desc2Input;
  window.detailsIntro = detailsIntro;
  window.editForm = editForm;
  window.editTvBtn = editTvBtn;
  window.equipDisplay = equipDisplay;
  window.freqInput = freqInput;
  window.jobDescCodeInput = jobDescCodeInput;
  window.lastDateInput = lastDateInput;
  window.lastDatePerf = lastDatePerf;
  window.mileageFromInput = mileageFromInput;
  window.mileageToInput = mileageToInput;
  window.mstIdDisplay = mstIdDisplay;
  window.protMethodInput = protMethodInput;
  window.protTypeInput = protTypeInput;
  window.removeTvBtn = removeTvBtn;
  window.revertBtn = revertBtn;
  window.saveBtn = saveBtn;
  window.saveTvBtn = saveTvBtn;
  window.sidebarEl = sidebar;
  window.taskDisplay = taskDisplay;
  window.tvActions = tvActions;
  window.tvAppliedLabel = tvAppliedLabel;
  window.tvExpiryInput = tvExpiryInput;
  window.tvForm = tvForm;
  window.tvReferenceInput = tvReferenceInput;
  window.unitsRequiredInput = unitsRequiredInput;
  window.unitsRequiredLabel = unitsRequiredLabel;
  window.wgInput = wgInput;
  window.nextDateCalc = nextDateCalc;
  window.loading = loading;

  toggleTvButtons(false);
  setTvControlsVisible(false);
};

const bindTvButtons = (elements) => {
  const { applyTvBtn, editTvBtn, removeTvBtn, saveTvBtn, cancelTvBtn } = elements;

  applyTvBtn?.addEventListener("click", () => {
    const mstId = window.mstIdDisplay?.value || window.currentMstId;
    if (!mstId) {
      alert("Select an MST before applying a TV.");
      return;
    }

    if (window.tvForm) window.tvForm.classList.add("visible");
    window.tvReferenceInput?.focus();
  });

  editTvBtn?.addEventListener("click", () => {
    const mstId = window.mstIdDisplay?.value || window.currentMstId;
    const baseEvent = window.calendar?.getEventById(`${mstId}_0`);

    if (!mstId || !baseEvent) {
      alert("Select an MST before editing a TV.");
      return;
    }

    const reference = normalizeTvReference(baseEvent.extendedProps.tvReference);
    const expiry = normalizeTvExpiry(baseEvent.extendedProps.tvExpiryDate);

    if (!isActiveTv(reference, expiry)) {
      alert("This MST does not have a TV to edit.");
      return;
    }

    if (window.tvReferenceInput) window.tvReferenceInput.value = reference;
    if (window.tvExpiryInput) window.tvExpiryInput.value = expiry;
    if (window.tvForm) window.tvForm.classList.add("visible");
    window.tvReferenceInput?.focus();
  });

  cancelTvBtn?.addEventListener("click", closeTvForm);

  saveTvBtn?.addEventListener("click", () => {
    const mstId = window.mstIdDisplay?.value || window.currentMstId;
    MST.Editor.applyTvToMst(mstId);
  });

  removeTvBtn?.addEventListener("click", () => {
    const mstId = window.mstIdDisplay?.value || window.currentMstId;
    if (!mstId) {
      alert("Select an MST before removing a TV.");
      return;
    }
    MST.Editor.removeTvFromMst(mstId);
  });
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
  if (window.sidebarEl?.classList) window.sidebarEl.classList.remove("has-tv-reference");
  if (window.editForm?.classList) window.editForm.classList.remove("has-tv-reference");
  if (window.tvAppliedLabel?.classList) window.tvAppliedLabel.classList.remove("visible");
  setTvControlsVisible(false);
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
  const allowMultipleToggle = document.getElementById("newAllowMultiple");

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

  if (allowMultipleToggle) {
    allowMultipleToggle.checked = false;
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
  
    document.addEventListener('DOMContentLoaded', function () {

    const dom = getDomElements();
    const {
      calEl,
      exportBtn,
      exportBtnCompact,
      batchNumber,
      batchNumberCompact,
      resetAllBtn,
      lastDateInput,
      freqInput,
      desc2Input,
      desc2Counter,
      newDesc2Input,
      newDesc2Counter,
      mileageFromInput,
      mileageToInput,
    } = dom;

    if (!calEl) {
      console.error("❌ #calendar element not found");
      return;
    }

    exposeDomElements(dom);

    lastDateInput?.addEventListener("input", E.refreshNextScheduledDisplay);
    freqInput?.addEventListener("input", E.refreshNextScheduledDisplay);

    bindMileageFormatter(mileageFromInput);
    bindMileageFormatter(mileageToInput);
    bindDesc2Limiter(desc2Input, desc2Counter);
    bindDesc2Limiter(newDesc2Input, newDesc2Counter);

    bindBatchMirroring(batchNumber, batchNumberCompact);
    bindExportButton(exportBtn);
    bindExportButton(exportBtnCompact);

    resetAllBtn?.addEventListener("click", MST.Editor.resetAllChanges);

    bindTvButtons(dom);

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

  // For footprint/access events, use the event title directly
  if (props.isFootprint) {
    return {
      html: `<div class="footprint-event-content">${ev.title || ''}</div>`
    };
  }

  const equipDesc = props.equipmentDesc1 || "";
  const desc1 = props.desc1 || "";
  const desc2 = props.desc2 || "";

  const mstId = props.mstId;
  let statusIcon = "";
  let statusClass = "";

  if (props.isNew) {
    statusIcon = "⭐";
    statusClass = "event-icon--new";
  } else if (typeof MST?.Editor?.hasChanged === "function" && MST.Editor.hasChanged(mstId)) {
    statusIcon = "✏️";
    statusClass = "event-icon--edited";
  }

  return {
    html: `
      <div class="event-icon ${statusClass}">${statusIcon}</div>
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
  const isNew = !!baseEvent?.extendedProps?.isNew;

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
        isNew,
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

    const tvReference = normalizeTvReference(
      baseEvent.extendedProps.tvReference ||
      orig["Temp Var Reference Number"] ||
      orig["TV Reference"]
    );
    const tvExpiryDate = normalizeTvExpiry(
      baseEvent.extendedProps.tvExpiryDate ||
      orig["TV Expiry Date"]
    );

    const hasTvReference = isActiveTv(tvReference, tvExpiryDate);
    baseEvent.setExtendedProp("tvReference", tvReference);
    baseEvent.setExtendedProp("tvExpiryDate", tvExpiryDate);
    baseEvent.setExtendedProp("hasTvReference", hasTvReference);
    window.currentMstId = mstId;
    setTvControlsVisible(true);

    const stdJobUom = resolveStdJobUom(stdJobNo, baseEvent, orig);
    baseEvent.setExtendedProp("stdJobUom", stdJobUom);
    baseEvent.setExtendedProp("unitMeasure", stdJobUom);

    if (window.tvReferenceInput) window.tvReferenceInput.value = hasTvReference ? tvReference : "";
    if (window.tvExpiryInput) window.tvExpiryInput.value = hasTvReference ? tvExpiryDate : "";
    closeTvForm();
    applyTvStyling(baseEvent, hasTvReference);

    const unitsRequiredLabel = window.unitsRequiredLabel;
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
        window.allowMultipleInput,
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
        } else if (input.type === "checkbox") {
          input.checked = false;
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

      const allowMultipleVal = normalizeAllowMultipleFlag(
        baseEvent.extendedProps.allowMultiple || orig["Allow Multiple workorders"]
      );
      if (window.allowMultipleInput) {
        window.allowMultipleInput.checked = allowMultipleVal === "YES";
      }
	
    window.desc2Input.value = clampDesc2(
      (baseEvent.extendedProps.desc2 ||
       orig["MST Description 2"] ||
       "").trimEnd()
    );
    updateCharCounter(window.desc2Input, window.desc2Counter);

    window.wgInput.value = baseEvent.extendedProps.workGroup || orig["Work Group Code"] || "";
    window.unitsRequiredInput.value = baseEvent.extendedProps.unitsRequired || orig["Units Required"] || "";
    const segFromVal = baseEvent.extendedProps.segFrom ?? orig["MST Segment Mileage From"] ?? "";
    const segToVal   = baseEvent.extendedProps.segTo   ?? orig["MST Segment Mileage To"]   ?? "";

    window.mileageFromInput.value = formatMileageValue(segFromVal);
    window.mileageToInput.value   = formatMileageValue(segToVal);
    if (window.mileageFromInput?.dataset) window.mileageFromInput.dataset.edited = "false";
    if (window.mileageToInput?.dataset) window.mileageToInput.dataset.edited = "false";

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
    const currentPTRaw =
      (baseEvent.extendedProps.protType ||
       orig["Protection Type Code"] ||
       orig.protType || "");
    const currentPT = currentPTRaw
      ? currentPTRaw.toString().padStart(2,"0")
      : "";

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
    const currentPMRaw =
      (baseEvent.extendedProps.protMethod ||
       orig["Protection Method Code"] ||
       orig.protMethod || "");
    const currentPM = currentPMRaw
      ? currentPMRaw.toString().padStart(2,"0")
      : "";

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

  MST.Editor.applyTvToMst = function(mstId) {
    if (!mstId) return;

    const baseEvent = window.calendar?.getEventById(`${mstId}_0`);
    if (!baseEvent) {
      alert("Select an MST before applying a TV.");
      return;
    }

    const reference = normalizeTvReference(window.tvReferenceInput?.value);
    const expiryRaw = window.tvExpiryInput?.value;
    const expiry = normalizeTvExpiry(expiryRaw);

    if (!reference || !expiry) {
      alert("Please enter both a TV Reference and an expiry date. Use Remove TV to clear TV information from the MST.");
      return;
    }

    const hasTv = isActiveTv(reference, expiry);

    baseEvent.setExtendedProp("tvReference", reference);
    baseEvent.setExtendedProp("tvExpiryDate", expiry);
    baseEvent.setExtendedProp("hasTvReference", hasTv);

    applyTvStyling(baseEvent, hasTv);

    if (baseEvent.extendedProps.isNew && window.createdMSTs?.[mstId]) {
      window.createdMSTs[mstId]["TV Reference"] = reference;
      window.createdMSTs[mstId]["TV Expiry Date"] = expiry;
    }

    MST.Editor.markMSTAsChanged(mstId);

    if (typeof window.MST?.ErrorUI?.recheckSingleMst === "function") {
      window.MST.ErrorUI.recheckSingleMst(mstId);
    }

    closeTvForm();
  };

  MST.Editor.removeTvFromMst = function(mstId) {
    if (!mstId) return;
    if (!confirm("Are you sure you want to remove this TV?")) return;

    const baseEvent = window.calendar?.getEventById(`${mstId}_0`);
    if (!baseEvent) {
      alert("Select an MST before removing a TV.");
      return;
    }

    baseEvent.setExtendedProp("tvReference", REMOVED_TV_REFERENCE);
    baseEvent.setExtendedProp("tvExpiryDate", REMOVED_TV_EXPIRY);
    baseEvent.setExtendedProp("hasTvReference", false);

    applyTvStyling(baseEvent, false);

    if (baseEvent.extendedProps.isNew && window.createdMSTs?.[mstId]) {
      window.createdMSTs[mstId]["TV Reference"] = REMOVED_TV_REFERENCE;
      window.createdMSTs[mstId]["TV Expiry Date"] = REMOVED_TV_EXPIRY;
    }

    MST.Editor.markMSTAsChanged(mstId);

    if (typeof window.MST?.ErrorUI?.recheckSingleMst === "function") {
      window.MST.ErrorUI.recheckSingleMst(mstId);
    }

    if (window.tvReferenceInput) window.tvReferenceInput.value = "";
    if (window.tvExpiryInput) window.tvExpiryInput.value = "";
    closeTvForm();
  };

  /* ----------------------------------------
     MARK MSTs AS CHANGED
     ---------------------------------------- */

  /* ----------------------------------------
     LOAD MSTs
     ---------------------------------------- */

  MST.Editor.loadMSTs = function(rows) {
  const MAX_RENDERED_MSTS = 10000; // Avoid overloading the calendar and GPU

  // Trim and remove control characters to prevent rendering crashes on corrupted text
  const safeText = (value, limit = 160) => {
    const raw = (value ?? "").toString();
    const cleaned = raw.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
    return cleaned.length > limit ? `${cleaned.slice(0, limit)}…` : cleaned;
  };

  const clampFrequency = value => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.min(parsed, 3650); // cap to ~10 years to avoid overflow
  };

  const sourceRows = Array.isArray(rows) ? rows : [];
  const trimmedRows = sourceRows.slice(0, MAX_RENDERED_MSTS);
  if (sourceRows.length > MAX_RENDERED_MSTS) {
    console.warn(`⚠️ Only rendering first ${MAX_RENDERED_MSTS} MSTs to protect browser stability.`);
    alert(`Only the first ${MAX_RENDERED_MSTS} MSTs will be rendered to avoid crashing the browser.`);
  }

  // Clear state
  window.changes = {};
  if (window.changeCount) window.changeCount.innerText = "";
  window.futureEventsMap = {};
  window.originalProps = {};

  if (!window.calendar) return;
  if (window.loading) window.loading.style.display = "block";

  window.calendar.batchRendering(() => {
    window.calendar.getEvents().forEach(e => e.remove());

    trimmedRows.forEach(r => {
      let mstId = safeText(r["CONCAT"]);

      if (!mstId) {
        const eq = safeText(r["Equipment Number"]);
        const tn = safeText(r["MST Task Number"] || "").padStart(3, "0");
        if (eq && tn) {
          mstId = `${eq}_${tn}`;
          console.warn(`⚠️ Fallback mstId generated: ${mstId}`);
        } else {
          console.error("❌ Skipping MST row due to missing MST ID (CONCAT or fallback):", r);
          return;
        }
      }

      const freq = clampFrequency(r["MST Frequency"]);
      const rawLastDate = safeText(r["Last Scheduled Date"]);
      const stdJobNo = safeText(r["Std Job No"] || r["Standard Job Number"]);
      const stdJobUom = resolveStdJobUom(stdJobNo, null, r);
      if (!/^[0-9]{8}$/.test(rawLastDate)) return;

      const baseDate = MST.Utils.yyyymmddToDate(rawLastDate);
      if (!baseDate || !isFinite(baseDate.getTime())) return;

      // Force consistent 09:00 time to avoid DST shifts
      const eventStart = new Date(baseDate);
      eventStart.setHours(9, 0, 0, 0);
      if (!isFinite(eventStart.getTime())) return;

      if (typeof MST.Editor.ensureOriginalPropsStored === "function") {
        MST.Editor.ensureOriginalPropsStored(mstId, r);
      }

      const desc1 = safeText(r["MST Description 1"]);
      const desc2 = clampDesc2(safeText(r["MST Description 2"], MAX_DESC2_LENGTH));
      const equipmentDesc1 = safeText(r["Equipment Description 1"], 200);
      const workGroup = safeText(r["Work Group Code"]);
      const jobDescCode = safeText(r["Job Description Code"]);
      const tvReference = safeText(r["Temp Var Reference Number"] || r["TV Reference"]);
      const tvExpiryDate = normalizeTvExpiry(r["TV Expiry Date"]);
      const hasTvReference = isActiveTv(tvReference, tvExpiryDate);
      const baseColor = hasTvReference ? MST.Utils.TV_COLOR : MST.Utils.BASE_COLOR;

      try {
        window.calendar.addEvent({
          id: `${mstId}_0`,
          title: `${desc1} — ${desc2}`,
          start: eventStart,     // ← Correct placement
          allDay: false,         // ← Prevent DST-shifting behaviour
          backgroundColor: baseColor,
          borderColor: baseColor,
          classNames: hasTvReference ? ["tv-reference"] : [],
          extendedProps: {
            mstId,
            instance: 0,
            frequency: freq,
            desc1,
            desc2,
            equipmentNo: safeText(r["Equipment Number"]),
            taskNo: safeText(r["MST Task Number"]),
            stdJobNo,
            stdJobUom,
            unitMeasure: stdJobUom,
            equipmentDesc1,
            workGroup,
            jobDescCode,
            unitsRequired: safeText(r["Units Required"]),
            segFrom: safeText(r["MST Segment Mileage From"]),
            segTo: safeText(r["MST Segment Mileage To"]),
            protType: safeText(r["Protection Type Code"]),
            protMethod: safeText(r["Protection Method Code"]),
            allowMultiple: normalizeAllowMultipleFlag(r["Allow Multiple workorders"]),
            resourceHours: parseFloat(r["Resource Hours"] || 0),
            tvReference,
            tvExpiryDate,
            hasTvReference
          }
        });
      } catch (err) {
        console.error("❌ Failed to add MST event; skipping", mstId, err);
        return;
      }

      if (typeof MST.Editor.rebuildFutureInstances === "function") {
        MST.Editor.rebuildFutureInstances(
          mstId,
          baseDate,
          freq,
          desc1,
          desc2
        );
      }
    });
  });

  if (window.loading) window.loading.style.display = "none";
};


  /* ----------------------------------------
     SAVE MST EDITS
     ---------------------------------------- */
  const applyMstUpdates = (mstId, updates = {}) => {
    const baseEvent = window.calendar?.getEventById(`${mstId}_0`);
    if (!baseEvent) return null;

    const props = baseEvent.extendedProps || {};
    const isNew = props.isNew === true;
    const pickValue = (value, fallback) => (value === undefined ? fallback : value);

    const rawFreq = pickValue(updates.frequency, props.frequency);
    const freq = parseInt(rawFreq || "0", 10);

    const rawDesc2 = pickValue(updates.desc2, props.desc2);
    const desc2 = clampDesc2((rawDesc2 ?? "").toString().trimEnd());

    const workGroup = (pickValue(updates.workGroup, props.workGroup) ?? "").toString().trim();
    const jobDescCode = (pickValue(updates.jobDescCode, props.jobDescCode) ?? "").toString().trim();
    const unitsRequired = pickValue(updates.unitsRequired, props.unitsRequired) ?? "";

    const formattedSegFrom = formatMileageValue(pickValue(updates.segFrom, props.segFrom));
    const formattedSegTo = formatMileageValue(pickValue(updates.segTo, props.segTo));

    const protType = (pickValue(updates.protType, props.protType) ?? "").toString().trim();
    const protMethod = (pickValue(updates.protMethod, props.protMethod) ?? "").toString().trim();

    const allowMultipleRaw = updates.allowMultiple === undefined
      ? props.allowMultiple
      : updates.allowMultiple
        ? "YES"
        : "";
    const allowMultiple = normalizeAllowMultipleFlag(allowMultipleRaw);

    baseEvent.setExtendedProp("frequency", freq);
    baseEvent.setExtendedProp("desc2", desc2);
    baseEvent.setExtendedProp("workGroup", workGroup);
    baseEvent.setExtendedProp("jobDescCode", jobDescCode);
    baseEvent.setExtendedProp("unitsRequired", unitsRequired);
    baseEvent.setExtendedProp("segFrom", formattedSegFrom);
    baseEvent.setExtendedProp("segTo", formattedSegTo);
    baseEvent.setExtendedProp("protType", protType);
    baseEvent.setExtendedProp("protMethod", protMethod);
    baseEvent.setExtendedProp("allowMultiple", allowMultiple);

    let newBase = baseEvent.start;
    const rawDate = pickValue(updates.lastDate, "");
    const newDateStr = U.normalizeDateInput(rawDate || "");
    if (newDateStr) {
      const [y, m, d] = newDateStr.split("-");
      newBase = new Date(+y, +m - 1, +d);
      newBase.setHours(9, 0, 0, 0);
      baseEvent.setDates(newBase);
    }

    MST.Editor.rebuildFutureInstances(
      mstId,
      newBase,
      freq,
      baseEvent.extendedProps.desc1,
      desc2
    );

    triggerResourceChartRefresh();

    if (isNew && window.createdMSTs?.[mstId]) {
      Object.assign(window.createdMSTs[mstId], {
        "Freq": freq,
        "MST Desc 2": desc2,
        "Job Desc Code": jobDescCode,
        "Work Group": workGroup,
        "Unit Required": unitsRequired,
        "Allow Multiple workorders": allowMultiple,
        "Segment From": formattedSegFrom,
        "Segment To": formattedSegTo,
        "ProtectionType": protType,
        "ProtectionMethod": protMethod,
        "LSD": newDateStr || U.dateToInputYYYYMMDD(baseEvent.start)
      });
    } else {
      E.markMSTAsChanged(mstId);
    }

    if (typeof window.MST?.ErrorUI?.recheckSingleMst === "function") {
      window.MST.ErrorUI.recheckSingleMst(mstId);
    }

    return {
      baseEvent,
      formattedSegFrom,
      formattedSegTo
    };
  };

  MST.Editor.applyBulkEdits = function(mstId, updates) {
    const result = applyMstUpdates(mstId, updates);
    return Boolean(result);
  };

  MST.Editor.saveMSTEdits = function(mstId) {
    const segFromInput = window.mileageFromInput;
    const segToInput = window.mileageToInput;
    const readMileageValue = (inputEl) => {
      if (!inputEl) return undefined;
      if (inputEl.dataset?.edited === "true") return inputEl.value;
      return (inputEl.value ?? "").toString().trim() === "" ? null : undefined;
    };
    const segFromValue = readMileageValue(segFromInput);
    const segToValue = readMileageValue(segToInput);

    const result = applyMstUpdates(mstId, {
      lastDate: window.lastDateInput.value,
      frequency: window.freqInput.value,
      desc2: window.desc2Input.value,
      workGroup: window.wgInput.value,
      jobDescCode: window.jobDescCodeInput.value,
      unitsRequired: window.unitsRequiredInput.value,
      segFrom: segFromValue,
      segTo: segToValue,
      protType: window.protTypeInput.value,
      protMethod: window.protMethodInput.value,
      allowMultiple: window.allowMultipleInput?.checked
    });

    if (!result) return;

    window.mileageFromInput.value = result.formattedSegFrom;
    window.mileageToInput.value = result.formattedSegTo;

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

    const tvReference = normalizeTvReference(
      orig["Temp Var Reference Number"] ||
      orig["TV Reference"]
    );
    const tvExpiryDate = normalizeTvExpiry(orig["TV Expiry Date"]);
    const hasTvReference = isActiveTv(tvReference, tvExpiryDate);
    const baseColor = hasTvReference ? U.TV_COLOR : U.BASE_COLOR;

    // Base green
    const baseEvent = window.calendar.addEvent({
      id: `${mstId}_0`,
      title: `${orig["MST Description 1"] || ""} — ${orig["MST Description 2"] || ""}`,
      start: baseDate,

      backgroundColor: baseColor,
      borderColor: baseColor,
      classNames: hasTvReference ? ["tv-reference"] : [],
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
        protMethod: orig["Protection Method Code"] || "",
        allowMultiple: normalizeAllowMultipleFlag(orig["Allow Multiple workorders"]),
        tvReference,
        tvExpiryDate,
        hasTvReference
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
  const desc2       = clampDesc2(document.getElementById("newDesc2").value.trim());
  const jobDescCode = document.getElementById("newJobCode").value.trim();
  const freq        = parseInt(document.getElementById("newFreq").value.trim(), 10);
  const lastDateStr = document.getElementById("newLastDate").value;
    const unitsReq    = document.getElementById("newUnits").value.trim();
    const protType    = document.getElementById("newProtType").value.trim();
    const protMethod  = document.getElementById("newProtMethod").value.trim();
    const wgCode      = document.getElementById("newWorkGroup").value.trim();
    const allowMultiple = normalizeAllowMultipleFlag(
      document.getElementById("newAllowMultiple")?.checked ? "YES" : ""
    );

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

    backgroundColor: MST.Utils.BASE_COLOR,
    borderColor: MST.Utils.BASE_COLOR,
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
      allowMultiple,
      unitMeasure: stdJobUom,
      instance: 0,
      isNew: true,
      tvReference: "",
      tvExpiryDate: "",
      hasTvReference: false
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
    "Allow Multiple workorders": allowMultiple,
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
      pm: baseEvent.extendedProps.protMethod,
      allowMultiple: normalizeAllowMultipleFlag(baseEvent.extendedProps.allowMultiple),
      tvReference: baseEvent.extendedProps.tvReference,
      tvExpiry: normalizeTvExpiry(baseEvent.extendedProps.tvExpiryDate)
    };

    const normalizedLastSched = U.normalizeDateInput(orig["Last Scheduled Date"] || "");
    const normalizedCurLastSched = U.normalizeDateInput(cur.lastSched);

    const normalizedUnitsOld = U.normalizeNumericField(orig["Units Required"] || "");
    const normalizedUnitsNew = U.normalizeNumericField(cur.units);

    const normalizedSegFromOld = U.normalizeNumericField(orig["MST Segment Mileage From"] || "");
    const normalizedSegFromNew = U.normalizeNumericField(cur.segFrom);

    const normalizedSegToOld = U.normalizeNumericField(orig["MST Segment Mileage To"] || "");
    const normalizedSegToNew = U.normalizeNumericField(cur.segTo);
    const origAllowMultiple = normalizeAllowMultipleFlag(orig["Allow Multiple workorders"]);
    const curAllowMultiple = cur.allowMultiple;
    const origTvReference = normalizeTvReference(
      orig["Temp Var Reference Number"] ||
      orig["TV Reference"]
    );
    const origTvExpiry = normalizeTvExpiry(orig["TV Expiry Date"]);

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
      New_Protection_Method_Code: cur.pm,

      Old_Allow_Multiple_Workorders: origAllowMultiple,
      New_Allow_Multiple_Workorders: curAllowMultiple,

      Old_TV_Reference: origTvReference,
      New_TV_Reference: normalizeTvReference(cur.tvReference),

      Old_TV_Expiry_Date: origTvExpiry,
      New_TV_Expiry_Date: cur.tvExpiry
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
      row.New_Protection_Method_Code !== row.Old_Protection_Method_Code ||
      row.New_Allow_Multiple_Workorders !== row.Old_Allow_Multiple_Workorders ||
      row.New_TV_Reference !== row.Old_TV_Reference ||
      row.New_TV_Expiry_Date !== row.Old_TV_Expiry_Date;

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
