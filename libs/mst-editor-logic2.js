/* ===========================================================
   MST EDITOR + CALENDAR LOGIC (Namespaced)
   Depends on: MST.Utils
   =========================================================== */
const U = MST.Utils;

window.MST = window.MST || {};
window.MST.Editor = window.MST.Editor || {};


document.addEventListener("DOMContentLoaded", () => {

// Ensure original MST data is preserved for revert/compare
window.MST.Editor.ensureOriginalPropsStored = function(mstId, row) {
  if (!window.originalProps) window.originalProps = {};
  if (!mstId) {
    console.warn("❌ Missing mstId when storing original props:", row);
    return;
  }
  if (!window.originalProps[mstId]) {
    const clone = structuredClone(row);
    clone["MST Description 2"] = (clone["MST Description 2"] || "").trimEnd();
    window.originalProps[mstId] = clone;
  }
};

/* ===========================================================
   OPEN NEW MST MODAL
   =========================================================== */
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
        desc1Input.value = "";
        uomInput.value   = "";
      }
    };

    if (!stdJobInput.dataset.stdJobBound) {
      stdJobInput.addEventListener("input", updateFromStdJob);
      stdJobInput.addEventListener("blur", updateFromStdJob);
      stdJobInput.dataset.stdJobBound = "true";
    }

    updateFromStdJob();
  }
};

/* ===========================================================
   REBUILD FUTURE INSTANCES (AMBER/RED)
   =========================================================== */
MST.Editor.rebuildFutureInstances = function(mstId, baseDate, freqDays, desc1, desc2) {
  window.futureEventsMap[mstId] = window.futureEventsMap[mstId] || [];
  const arr = window.futureEventsMap[mstId];
  arr.forEach(ev => ev.remove());
  window.futureEventsMap[mstId] = [];

  const base = new Date(baseDate);
  base.setHours(9, 0, 0, 0);

  const newArr = [];

  for (let i = 1; i <= 2; i++) {
    const dt = U.addDays(base, freqDays * i);
    dt.setHours(9, 0, 0, 0);
    const color = (i === 1)
      ? MST.Utils.FUTURE1_COLOR
      : MST.Utils.FUTURE2_COLOR;

    const ev = window.calendar.addEvent({
      id: `${mstId}_${i}`,
      title: `${desc1}${desc2 ? " — " + desc2 : ""}`,
      start: dt,
      allDay: false,
      backgroundColor: color,
      borderColor: color,
      extendedProps: {
        mstId,
        instance: i,
        desc1,
        desc2
      }
    });
    newArr.push(ev);
  }

  window.futureEventsMap[mstId] = newArr;
};

/* ===========================================================
   OPEN EDITOR FOR MST
   =========================================================== */
MST.Editor.openEditorForMST = function(mstId, baseEvent) {
  if (!baseEvent) {
    baseEvent = window.calendar.getEventById(`${mstId}_0`);
    if (!baseEvent) {
      console.warn("No base MST event found for", mstId);
      return;
    }
  }

  const isNew = !!baseEvent.extendedProps.isNew;
  const orig = isNew ? baseEvent.extendedProps : window.originalProps[mstId];

  if (!orig) {
    console.warn("No original props for MST", mstId);
    return;
  }

  if (window.detailsIntro) window.detailsIntro.style.display = "none";
  if (window.editForm) window.editForm.style.display = "block";

  if (window.equipDisplay) window.equipDisplay.value = orig["Equipment Number"] || baseEvent.extendedProps.equipmentNo || "";
  if (window.taskDisplay) window.taskDisplay.value = orig["MST Task Number"] || baseEvent.extendedProps.taskNo || "";
  if (window.mstIdDisplay) window.mstIdDisplay.value = mstId || "";

  if (window.desc1Display) {
    window.desc1Display.value =
      orig["MST Description 1"] || baseEvent.extendedProps.desc1 || "";
  }

  if (window.lastDatePerf) {
    window.lastDatePerf.value = U.dateToInputYYYYMMDD(
      U.yyyymmddToDate(orig["Last Performed Date"] || "") || baseEvent.start
    );
  }

  if (window.lastDateInput) {
    window.lastDateInput.value = U.dateToInputYYYYMMDD(
      U.yyyymmddToDate(orig["Last Scheduled Date"] || "") || baseEvent.start
    );
  }

  if (window.freqInput) window.freqInput.value = baseEvent.extendedProps.frequency ?? orig["MST Frequency"] ?? "";
  if (window.desc2Input) {
    window.desc2Input.value =
      (baseEvent.extendedProps.desc2 ||
       orig["MST Description 2"] ||
       "").trimEnd();
  }

  if (window.wgInput) window.wgInput.value = baseEvent.extendedProps.workGroup || orig["Work Group Code"] || "";
  if (window.jobDescCodeInput) window.jobDescCodeInput.value = baseEvent.extendedProps.jobDescCode || orig["Job Description Code"] || "";
  if (window.unitsRequiredInput) window.unitsRequiredInput.value = baseEvent.extendedProps.unitsRequired || orig["Units Required"] || "";
  if (window.mileageFromInput) window.mileageFromInput.value = baseEvent.extendedProps.segFrom || orig["MST Segment Mileage From"] || "";
  if (window.mileageToInput) window.mileageToInput.value = baseEvent.extendedProps.segTo || orig["MST Segment Mileage To"] || "";
  if (window.protTypeInput) window.protTypeInput.value = baseEvent.extendedProps.protType || orig["Protection Type Code"] || "";
  if (window.protMethodInput) window.protMethodInput.value = baseEvent.extendedProps.protMethod || orig["Protection Method Code"] || "";

  if (typeof MST.Editor.refreshNextScheduledDisplay === "function") {
    MST.Editor.refreshNextScheduledDisplay();
  }

  const form = document.getElementById("editForm");
  if (form) form.scrollIntoView({ behavior: "smooth" });
};

/* ===========================================================
   REFRESH NEXT SCHEDULED DISPLAY
   =========================================================== */
MST.Editor.refreshNextScheduledDisplay = function() {
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

/* ===========================================================
   LOAD MSTs INTO CALENDAR
   =========================================================== */
MST.Editor.loadMSTs = function(rows) {
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
      if (!/^[0-9]{8}$/.test(rawLastDate)) return;

      const baseDate = U.yyyymmddToDate(rawLastDate);
      if (!baseDate) return;

      baseDate.setHours(9, 0, 0, 0);
      if (typeof MST.Editor.ensureOriginalPropsStored === "function") {
        MST.Editor.ensureOriginalPropsStored(mstId, r);
      }

      const eventStart = new Date(baseDate);
      eventStart.setHours(9, 0, 0, 0);

      window.calendar.addEvent({
        id: `${mstId}_0`,
        title: `${r["MST Description 1"] || ""} — ${r["MST Description 2"] || ""}`,
        start: eventStart,
        allDay: false,
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

      if (typeof MST.Editor.rebuildFutureInstances === "function" && freq > 0) {
        MST.Editor.rebuildFutureInstances(
          mstId,
          baseDate,
          freq,
          r["MST Description 1"] || "",
          (r["MST Description 2"] || "").trimEnd()
        );
      }
    });
  });

  if (window.loading) window.loading.style.display = "none";
};

/* ===========================================================
   CHANGE EXPORT ROW BUILDER
   =========================================================== */
const E = window.MST.Editor;

E.buildChangeExportRow = function(mstId) {
  const baseEvent = window.calendar.getEventById(`${mstId}_0`);
  if (!baseEvent) return null;

  const orig = window.originalProps[mstId] || {};
  const cur = baseEvent.extendedProps;

  const oldDesc2 = (orig["MST Description 2"] || "").trimEnd();
  const newDesc2 = (cur.desc2 || "").trimEnd();

  const row = {
    MST_ID: mstId,
    Equipment: cur.equipmentNo || orig["Equipment Number"] || "",
    "Task No": cur.taskNo || orig["MST Task Number"] || "",
    Old_Frequency: orig["MST Frequency"] || "",
    New_Frequency: cur.frequency || "",
    Old_Desc2: oldDesc2,
    New_Desc2: newDesc2,
    Old_Last_Scheduled_Date: orig["Last Scheduled Date"] || "",
    New_Last_Scheduled_Date: U.inputToYYYYMMDD(window.lastDateInput?.value || "") || "",
    Old_Work_Group_Code: orig["Work Group Code"] || "",
    New_Work_Group_Code: cur.workGroup || "",
    Old_Job_Desc_Code: orig["Job Description Code"] || "",
    New_Job_Desc_Code: cur.jobDescCode || "",
    Old_Units_Required: orig["Units Required"] || "",
    New_Units_Required: cur.unitsRequired || "",
    Old_Segment_From: orig["MST Segment Mileage From"] || "",
    New_Segment_From: cur.segFrom || "",
    Old_Segment_To: orig["MST Segment Mileage To"] || "",
    New_Segment_To: cur.segTo || "",
    Old_Protection_Type_Code: orig["Protection Type Code"] || "",
    New_Protection_Type_Code: cur.protType || "",
    Old_Protection_Method_Code: orig["Protection Method Code"] || "",
    New_Protection_Method_Code: cur.protMethod || "",
    resourceHours: cur.resourceHours || orig["Resource Hours"] || ""
  };

  return row;
};

/* ===========================================================
   MARK MST AS CHANGED (FINAL VERSION)
   =========================================================== */
MST.Editor.markMSTAsChanged = function(mstId) {
  const row = E.buildChangeExportRow(mstId);
  if (!row) return;

  const changed =
    row.New_Frequency != row.Old_Frequency ||
    row.New_Desc2 !== row.Old_Desc2 ||
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

  if (window.changeCount) {
    const count = Object.keys(window.changes).length;
    window.changeCount.innerText = count ? `Changes: ${count}` : "";
  }

  const baseEvent = window.calendar.getEventById(`${mstId}_0`);
  if (!baseEvent) return;

  const originalTitle = baseEvent.title.replace(/\*Amended\*/gi, "").trim();

  if (window.changes[mstId]) {
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

/* ===========================================================
   REVERT MST
   =========================================================== */
MST.Editor.revertMST = function(mstId) {
  const orig = window.originalProps[mstId];
  if (!orig) {
    console.warn("No original props to revert for", mstId);
    return;
  }

  const baseEvent = window.calendar.getEventById(`${mstId}_0`);
  if (!baseEvent) return;

  const rawLast = orig["Last Scheduled Date"] || "";
  const baseDate = U.yyyymmddToDate(rawLast);
  if (!baseDate) return;
  baseDate.setHours(9, 0, 0, 0);

  baseEvent.setStart(baseDate);
  baseEvent.setExtendedProp("frequency", parseInt(orig["MST Frequency"]) || 0);
  baseEvent.setExtendedProp("desc2", (orig["MST Description 2"] || "").trimEnd());
  baseEvent.setExtendedProp("workGroup", orig["Work Group Code"] || "");
  baseEvent.setExtendedProp("jobDescCode", orig["Job Description Code"] || "");
  baseEvent.setExtendedProp("unitsRequired", orig["Units Required"] || "");
  baseEvent.setExtendedProp("segFrom", orig["MST Segment Mileage From"] || "");
  baseEvent.setExtendedProp("segTo", orig["MST Segment Mileage To"] || "");
  baseEvent.setExtendedProp("protType", orig["Protection Type Code"] || "");
  baseEvent.setExtendedProp("protMethod", orig["Protection Method Code"] || "");

  if (window.lastDateInput) {
    window.lastDateInput.value = U.dateToInputYYYYMMDD(baseDate);
  }
  if (window.freqInput) window.freqInput.value = baseEvent.extendedProps.frequency || "";
  if (window.desc2Input) window.desc2Input.value = baseEvent.extendedProps.desc2 || "";
  if (window.wgInput) window.wgInput.value = baseEvent.extendedProps.workGroup || "";
  if (window.jobDescCodeInput) window.jobDescCodeInput.value = baseEvent.extendedProps.jobDescCode || "";
  if (window.unitsRequiredInput) window.unitsRequiredInput.value = baseEvent.extendedProps.unitsRequired || "";
  if (window.mileageFromInput) window.mileageFromInput.value = baseEvent.extendedProps.segFrom || "";
  if (window.mileageToInput) window.mileageToInput.value = baseEvent.extendedProps.segTo || "";
  if (window.protTypeInput) window.protTypeInput.value = baseEvent.extendedProps.protType || "";
  if (window.protMethodInput) window.protMethodInput.value = baseEvent.extendedProps.protMethod || "";

  MST.Editor.rebuildFutureInstances(
    mstId,
    baseDate,
    baseEvent.extendedProps.frequency || 0,
    baseEvent.extendedProps.desc1 || orig["MST Description 1"] || "",
    baseEvent.extendedProps.desc2 || ""
  );

  delete window.changes[mstId];
  if (window.changeCount) {
    const count = Object.keys(window.changes).length;
    window.changeCount.innerText = count ? `Changes: ${count}` : "";
  }

  const originalTitle = baseEvent.title.replace(/\*Amended\*/gi, "").trim();
  baseEvent.setProp("title", originalTitle);
  const filtered = (baseEvent.classNames || []).filter(c => c !== "changed-mst");
  baseEvent.setProp("classNames", filtered);
};

/* ===========================================================
   DEACTIVATE MST
   =========================================================== */
MST.Editor.deactivateMST = function(mstId) {
  const baseEvent = window.calendar.getEventById(`${mstId}_0`);
  if (!baseEvent) return;

  baseEvent.setExtendedProp("deactivated", true);
  baseEvent.setProp("backgroundColor", MST.Utils.DEACTIVATED_COLOR);
  baseEvent.setProp("borderColor", MST.Utils.DEACTIVATED_COLOR);
};

/* ===========================================================
   ADD NEW MST
   =========================================================== */
MST.Editor.addNewMST = function() {
  const equipNo    = document.getElementById("newEquipNo")?.value.trim();
  const stdJobNo   = document.getElementById("newStdJobNo")?.value.trim();
  const desc1      = document.getElementById("newDesc1")?.value.trim();
  const desc2      = document.getElementById("newDesc2")?.value.trimEnd();
  const wg         = document.getElementById("newWorkGroup")?.value.trim();
  const jobCode    = document.getElementById("newJobCode")?.value.trim();
  const freqStr    = document.getElementById("newFreq")?.value.trim();
  const lastDate   = document.getElementById("newLastDate")?.value;
  const unitsReq   = document.getElementById("newUnits")?.value.trim();
  const uom        = document.getElementById("newUnitMeasure")?.value.trim();
  const fromSeg    = document.getElementById("newFrom")?.value.trim();
  const toSeg      = document.getElementById("newTo")?.value.trim();
  const protType   = document.getElementById("newProtType")?.value.trim();
  const protMethod = document.getElementById("newProtMethod")?.value.trim();

  if (!equipNo || !stdJobNo || !desc1 || !wg || !jobCode || !freqStr || !lastDate || !unitsReq || !protType || !protMethod) {
    alert("Please complete all mandatory fields (*) for New MST.");
    return;
  }

  const freq = parseInt(freqStr, 10) || 0;

  const [y, m, d] = lastDate.split("-");
  const baseDate = new Date(+y, +m - 1, +d);
  baseDate.setHours(9, 0, 0, 0);

  const mstId = `${equipNo}_${stdJobNo}_NEW_${Date.now()}`;

  window.originalProps[mstId] = {
    "Equipment Number": equipNo,
    "MST Task Number": stdJobNo,
    "MST Description 1": desc1,
    "MST Description 2": desc2,
    "MST Frequency": freq,
    "Last Scheduled Date": U.inputToYYYYMMDD(lastDate),
    "Work Group Code": wg,
    "Job Description Code": jobCode,
    "Units Required": unitsReq,
    "MST Segment Mileage From": fromSeg,
    "MST Segment Mileage To": toSeg,
    "Protection Type Code": protType,
    "Protection Method Code": protMethod
  };

  const baseEvent = window.calendar.addEvent({
    id: `${mstId}_0`,
    title: `${desc1}${desc2 ? " — " + desc2 : ""}`,
    start: baseDate,
    allDay: false,
    backgroundColor: MST.Utils.NEW_MST_COLOR,
    borderColor: MST.Utils.NEW_MST_COLOR,
    extendedProps: {
      mstId,
      instance: 0,
      frequency: freq,
      desc1,
      desc2,
      equipmentNo: equipNo,
      taskNo: stdJobNo,
      equipmentDesc1: "",
      workGroup: wg,
      jobDescCode: jobCode,
      unitsRequired: unitsReq,
      segFrom: fromSeg,
      segTo: toSeg,
      protType,
      protMethod,
      isNew: true
    }
  });

  MST.Editor.rebuildFutureInstances(
    mstId,
    baseDate,
    freq,
    desc1,
    desc2
  );

  const modal = document.getElementById("newMSTModal");
  if (modal) {
    modal.style.display = "none";
    modal.style.pointerEvents = "none";
  }
};

});