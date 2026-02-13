(function () {

const formatDateDMY = (value) => {
  if (window.MST?.Utils?.formatDateDMY) return window.MST.Utils.formatDateDMY(value);
  return value ?? "";
};

const chunkString = (value, chunkSize = 30000) => {
  const text = String(value ?? "");
  if (!text) return [""];

  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
};

function formatDateTimeStamp(date) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const d = String(date.getDate()).padStart(2, "0");
  const m = months[date.getMonth()];
  const y = String(date.getFullYear()).slice(-2);
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");

  return `${d}-${m}-${y} ${h}:${min}`;
}


const normalizeDateInput = (value) => {
  if (window.MST?.Utils?.normalizeDateInput) return window.MST.Utils.normalizeDateInput(value);
  const raw = (value ?? "").toString().trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{8}$/.test(raw)) return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  return "";
};

const toDate = (value) => {
  const normalized = normalizeDateInput(value);
  if (!normalized) return null;
  const [y, m, d] = normalized.split("-").map(Number);
  const dt = new Date(y, m - 1, d, 9, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
};

const normalizeStdJobNo = (value) => {
  const raw = (value ?? "").toString().trim();
  if (!raw) return "";
  return raw.replace(/^0+/, "") || raw;
};

const isAbpStdJob = (stdJobNo) => {
  const normalized = normalizeStdJobNo(stdJobNo);
  if (!normalized) return false;
  return Boolean(window.STANDARD_JOBS?.[normalized]?.abp || window.STANDARD_JOBS?.[stdJobNo]?.abp);
};

const getFyStartForDate = (dateValue) => {
  const date = toDate(dateValue);
  if (!date) return null;
  const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(year, 3, 1, 9, 0, 0, 0);
};

const getFyEndFromStart = (fyStart) => new Date(fyStart.getFullYear() + 1, 2, 31, 23, 59, 59, 999);

const getRoughPeriodLabel = (date, fyStart) => {
  const dayMs = 24 * 60 * 60 * 1000;
  const offsetDays = Math.floor((date - fyStart) / dayMs);
  const period = Math.min(13, Math.max(1, Math.floor(offsetDays / 28) + 1));
  return `P${String(period).padStart(2, "0")}`;
};

const countInstancesAndVolume = ({ lsd, freq, units, rangeStart, rangeEnd }) => {
  const startDate = toDate(lsd);
  const frequency = Number.parseInt(freq, 10) || 0;
  const unitsNum = Number.parseFloat((units ?? "").toString());
  const unitValue = Number.isFinite(unitsNum) ? unitsNum : 0;

  if (!startDate || frequency <= 0 || !rangeStart || !rangeEnd || rangeEnd < rangeStart) {
    return { instances: 0, volume: 0, periodVolumes: {} };
  }

  const periodVolumes = {};
  let instances = 0;
  let cursor = new Date(startDate);

  while (cursor <= rangeEnd) {
    if (cursor >= rangeStart) {
      instances += 1;
      const label = getRoughPeriodLabel(cursor, rangeStart);
      periodVolumes[label] = (periodVolumes[label] || 0) + unitValue;
    }
    cursor.setDate(cursor.getDate() + frequency);
  }

  return {
    instances,
    volume: instances * unitValue,
    periodVolumes
  };
};

const formatPeriodVolumes = (periodVolumes = {}) => {
  const labels = Object.keys(periodVolumes).sort();
  if (!labels.length) return "";
  return labels.map((label) => `${label}:${periodVolumes[label]}`).join(" | ");
};





    MST.Export = MST.Export || {};

    MST.Export.exportChanges = async function () {

        const changeKeys = Object.keys(window.changes || {});
        const newKeys = Object.keys(window.createdMSTs || {});
        const batchNumber = document.getElementById("batchNumber").value.trim();
        const username =
            (window.currentUser && (window.currentUser.name || window.currentUser)) ||
            window.userName ||
            window.username ||
            (window.user && window.user.name) ||
            "";

        if (!changeKeys.length && !newKeys.length) {
            alert("No changes or new MSTs to export.");
            return;
        }

        if (!batchNumber) {
            alert("Please enter a Batch Number before exporting.");
            return;
        }

        const workbook = new ExcelJS.Workbook();

        const sessionSheet = workbook.addWorksheet("_MST_SESSION");
        sessionSheet.state = "veryHidden";

        const sessionPayload = {
            version: 1,
            exportedAt: new Date().toISOString(),
            batchNumber,
            username: username || "",
            changes: window.changes || {},
            createdMSTs: window.createdMSTs || {}
        };

        const payloadText = JSON.stringify(sessionPayload);
        const payloadChunks = chunkString(payloadText);

        sessionSheet.columns = [
            { key: "key", width: 30 },
            { key: "value", width: 120 }
        ];

        sessionSheet.addRow(["SESSION_SCHEMA", "MST_BATCH_RESUME_V1"]);
        sessionSheet.addRow(["PAYLOAD_CHUNK_COUNT", String(payloadChunks.length)]);
        payloadChunks.forEach((chunk, idx) => {
            const chunkNo = String(idx + 1).padStart(4, "0");
            sessionSheet.addRow([`PAYLOAD_${chunkNo}`, chunk]);
        });

        const headerSheet = workbook.addWorksheet("Header");
        headerSheet.columns = [
            { key: "label", width: 45 },
            { key: "value", width: 40 }
        ];

        const bannerStyle = {
            font: { bold: true, color: { argb: "FFFFFFFF" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4B5563" } },
            alignment: { vertical: "middle", horizontal: "left" }
        };

        const labelStyle = {
            font: { bold: true, color: { argb: "FFFFFFFF" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4B5563" } },
            border: {
                top: { style: "thin", color: { argb: "FF000000" } },
                left: { style: "thin", color: { argb: "FF000000" } },
                bottom: { style: "thin", color: { argb: "FF000000" } },
                right: { style: "thin", color: { argb: "FF000000" } }
            },
            alignment: { vertical: "middle" }
        };

        const valueStyle = {
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } },
            border: {
                top: { style: "thin", color: { argb: "FF000000" } },
                left: { style: "thin", color: { argb: "FF000000" } },
                bottom: { style: "thin", color: { argb: "FF000000" } },
                right: { style: "thin", color: { argb: "FF000000" } }
            },
            alignment: { vertical: "middle" }
        };

        headerSheet.addRow(["This spreadsheet includes MST changes for approval", ""]);
        headerSheet.addRow(["Note: New and Amended MSTs are recorded on seperate tabs. The Change Log sheet shows all changes made", ""]);
        headerSheet.mergeCells("A1:B1");
        headerSheet.mergeCells("A2:B2");
        headerSheet.getRow(1).eachCell(cell => Object.assign(cell, bannerStyle));
        headerSheet.getRow(2).eachCell(cell => Object.assign(cell, bannerStyle));
        headerSheet.addRow([null, null]);

        const headerData = [
            ["Date and Time", formatDateTimeStamp(new Date())],
            ["Batch Number", batchNumber],
            ["Username", username || "Not provided"],
            ["MST Amendment Calendar version", "0.5"],
            ["Number of MST changes", changeKeys.length],
            ["Number of new MSTs", newKeys.length]
        ];

        headerData.forEach(([label, value]) => {
            const row = headerSheet.addRow([label, value]);
            const labelCell = row.getCell(1);
            const valueCell = row.getCell(2);
            Object.assign(labelCell, { style: labelStyle });
            Object.assign(valueCell, { style: valueStyle });
        });

        headerSheet.eachRow({ includeEmpty: false }, row => {
            row.height = 20;
        });

        const headerStyle = {
            font: { bold: true, color: { argb: "FFFFFFFF" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } },
            alignment: { vertical: "middle", horizontal: "center" },
        };

        const mstHeaders = [
            "Equipment", "Task No", "Comp Code", "Mod Code", "Job Desc Code",
            "MST Type", "StatutoryMST", "Allow Multiple workorders",
            "MST Desc 1", "MST Desc 2", "Freq", "Unit Required", "Unit of Work",
            "Sched Ind", "Work Group", "Std Job No", "LPD", "LSD", "NSD",
            "Segment From", "Segment To", "Segment UOM", "Assign To",
            "ProtectionType", "ProtectionMethod", "TV Reference", "TV Expiry Date"
        ];

        // ------------------------------------------------------
        // 1️⃣ Sheet: Change Log
        // ------------------------------------------------------
        if (changeKeys.length) {

            const ws1 = workbook.addWorksheet("Change Log");

            ws1.columns = [
                { header: "MST ID", key: "MST_ID", width: 18 },
                { header: "Equipment", key: "Equipment", width: 18 },
                { header: "Equipment Description", key: "Equipment Description", width: 22 },
                { header: "Task No", key: "Task No", width: 12 },
                { header: "MST Description 1", key: "MST Description 1", width: 20 },
                { header: "Field Changed", key: "FieldChanged", width: 22 },
                { header: "Old Value", key: "OldValue", width: 22 },
                { header: "New Value", key: "NewValue", width: 22 }
            ];

            const changeData = Object.values(window.changes);

            const dateFields = new Set(["Last Scheduled Date", "TV Expiry Date"]);
            const codeDescriptionMaps = {
                "Job Description Code": new Map((window.MST_VARIABLES?.jobDescCodes || []).map(item => [item.code, item.desc])),
                "Protection Type Code": new Map((window.MST_VARIABLES?.protectionTypes || []).map(item => [item.code, item.desc])),
                "Protection Method Code": new Map((window.MST_VARIABLES?.protectionMethods || []).map(item => [item.code, item.desc]))
            };

            function formatCodeWithDescription(value, fieldLabel) {
                const map = codeDescriptionMaps[fieldLabel];
                if (!map) return value;
                const raw = (value ?? "").toString().trim();
                if (!raw) return "";

                const upper = raw.toUpperCase();
                const candidates = [raw, upper];
                if (fieldLabel !== "Job Description Code") {
                    candidates.push(raw.padStart(2, "0"));
                    candidates.push(upper.padStart(2, "0"));
                }

                for (const candidate of candidates) {
                    const desc = map.get(candidate);
                    if (desc) {
                        return `${candidate} — ${desc}`;
                    }
                }

                return raw;
            }

            function safeValue(value, fieldLabel) {
                if (value == null || value === "") return "";
                if (dateFields.has(fieldLabel)) return formatDateDMY(value);
                return formatCodeWithDescription(value, fieldLabel);
            }

            changeData.forEach(row => {

                const mstId = row.MST_ID;
                const orig = window.originalProps[mstId] || {};

                const equipment = orig["Equipment Number"] || "";
                const equipmentDesc = row.Equipment_Description || orig["Equipment Description 1"] || "";
                const taskNo = orig["MST Task Number"] || "";
                const mstDesc1 = row.MST_Description_1 || orig["MST Description 1"] || "";

          const fieldsToCheck = [
              ["MST Description 2", "Old_Desc2", "New_Desc2"],
              ["Work Group Code", "Old_Work_Group_Code", "New_Work_Group_Code"],
              ["Job Description Code", "Old_Job_Desc_Code", "New_Job_Desc_Code"],
              ["Frequency", "Old_Frequency", "New_Frequency"],
              ["Last Scheduled Date", "Old_Last_Scheduled_Date", "New_Last_Scheduled_Date"],
              ["Protection Type Code", "Old_Protection_Type_Code", "New_Protection_Type_Code"],
              ["Protection Method Code", "Old_Protection_Method_Code", "New_Protection_Method_Code"],
              ["Units Required", "Old_Units_Required", "New_Units_Required"],
              ["Allow Multiple workorders", "Old_Allow_Multiple_Workorders", "New_Allow_Multiple_Workorders"],
              ["Segment Mileage From", "Old_Segment_From", "New_Segment_From"],
              ["Segment Mileage To", "Old_Segment_To", "New_Segment_To"],
              ["TV Reference", "Old_TV_Reference", "New_TV_Reference"],
              ["TV Expiry Date", "Old_TV_Expiry_Date", "New_TV_Expiry_Date"]
          ];

                fieldsToCheck.forEach(([label, oldKey, newKey]) => {
                    const oldVal = row[oldKey];
                    const newVal = row[newKey];

                    if (oldVal !== newVal) {
                        ws1.addRow({
                            MST_ID: mstId,
                            Equipment: equipment,
                            "Equipment Description": equipmentDesc,
                            "Task No": taskNo,
                            "MST Description 1": mstDesc1,
                            FieldChanged: label,
                            OldValue: safeValue(oldVal, label),
                            NewValue: safeValue(newVal, label)
                        });
                    }
                });

            });

            ws1.getRow(1).eachCell(cell => Object.assign(cell, { style: headerStyle }));
            ws1.views = [{ state: 'frozen', ySplit: 1 }];

            // ------------------------------------------------------
            // 3️⃣ Sheet: MST Amend
            // ------------------------------------------------------
            const ws3 = workbook.addWorksheet("MST Amend");
            ws3.columns = mstHeaders.map(h => ({ header: h, key: h, width: 18 }));

            changeData.forEach(row => {
                const out = {};
                const orig = window.originalProps[row.MST_ID] || {};

                mstHeaders.forEach(h => {

                      let val =
                          (h === "Equipment"       && (row.Equipment || orig["Equipment Number"] || "")) ||
                          (h === "Task No"        && (row["Task No"] || orig["MST Task Number"] || "")) ||
                          (h === "MST Desc 1"     && (row["MST Desc 1"] || orig["MST Description 1"] || "")) ||
                          (h === "MST Desc 2"     && (row.New_Desc2 || row.Old_Desc2 || orig["MST Description 2"] || "")) ||
                          (h === "Freq"           && (row.New_Frequency || row.Old_Frequency || orig["MST Frequency"] || "")) ||
                          (h === "Work Group"     && (row.New_Work_Group_Code || row.Old_Work_Group_Code || orig["Work Group Code"] || "")) ||
                          (h === "Job Desc Code"  && (row.New_Job_Desc_Code || row.Old_Job_Desc_Code || orig["Job Description Code"] || "")) ||
                          (h === "Sched Ind"      && (row.New_Scheduling_Indicator_Code || row.Old_Scheduling_Indicator_Code || orig["Scheduling Indicator Code"] || "")) ||
                          (h === "LSD"            && (row.New_Last_Scheduled_Date || row.Old_Last_Scheduled_Date || orig["Last Scheduled Date"] || "")) ||
                          (h === "ProtectionType" && (row.New_Protection_Type_Code || row.Old_Protection_Type_Code || orig["Protection Type Code"] || "")) ||
                          (h === "Allow Multiple workorders" && (row.New_Allow_Multiple_Workorders || row.Old_Allow_Multiple_Workorders || orig["Allow Multiple workorders"] || "")) ||
                          (h === "ProtectionMethod" && (row.New_Protection_Method_Code || row.Old_Protection_Method_Code || orig["Protection Method Code"] || "")) ||
                          (h === "TV Reference" && (row.New_TV_Reference || row.Old_TV_Reference || orig["TV Reference"] || orig["Temp Var Reference Number"] || "")) ||
                          (h === "TV Expiry Date" && (row.New_TV_Expiry_Date || row.Old_TV_Expiry_Date || orig["TV Expiry Date"] || "")) ||
                          orig[h] || "";

                    if (["LSD", "NSD", "LPD", "TV Expiry Date"].includes(h)) {
                        val = formatDateDMY(val);
                    }

                    out[h] = val;
                });

                ws3.addRow(out);
            });

            ws3.getRow(1).eachCell(cell => Object.assign(cell, { style: headerStyle }));
            ws3.views = [{ state: 'frozen', ySplit: 1 }];
        }


        // ------------------------------------------------------
        // 2️⃣ Sheet: Created MSTs
        // ------------------------------------------------------
        if (newKeys.length) {

            const newData = Object.values(window.createdMSTs);
            const ws2 = workbook.addWorksheet("MST Create");

            ws2.columns = mstHeaders.map(h => ({ header: h, key: h, width: 18 }));

            newData.forEach(row => {
                const out = {};

                mstHeaders.forEach(h => {
                    let val = row[h] ?? "";

                    if (["LSD", "NSD", "LPD", "TV Expiry Date"].includes(h)) {
                        val = formatDateDMY(val);
                    }

                    out[h] = val;
                });

                ws2.addRow(out);
            });

            ws2.getRow(1).eachCell(cell => {
                Object.assign(cell, { style: headerStyle });
            });

            ws2.views = [{ state: 'frozen', ySplit: 1 }];
        }


        // ------------------------------------------------------
        // 4️⃣ Sheet: ABP Impact Summary (rough guide)
        // ------------------------------------------------------
        const abpRows = [];
        const todayIso = normalizeDateInput(new Date().toISOString().slice(0, 10));
        const changeDataForAbp = Object.values(window.changes || {});
        const newDataForAbp = Object.values(window.createdMSTs || {});

        const addAbpRow = (entry) => {
            if (!entry || !entry.stdJobNo || !isAbpStdJob(entry.stdJobNo)) return;

            const baseFyStart = getFyStartForDate(entry.baseLsd || entry.newLsd || entry.oldLsd);
            if (!baseFyStart) return;

            const currentFyStart = baseFyStart;
            const currentFyEnd = getFyEndFromStart(currentFyStart);
            const nextFyStart = new Date(currentFyStart.getFullYear() + 1, 3, 1, 9, 0, 0, 0);
            const nextFyEnd = getFyEndFromStart(nextFyStart);

            const oldCurrent = countInstancesAndVolume({
              lsd: entry.oldLsd,
              freq: entry.oldFreq,
              units: entry.oldUnits,
              rangeStart: currentFyStart,
              rangeEnd: currentFyEnd
            });
            const newCurrent = countInstancesAndVolume({
              lsd: entry.newLsd,
              freq: entry.newFreq,
              units: entry.newUnits,
              rangeStart: currentFyStart,
              rangeEnd: currentFyEnd
            });
            const oldNext = countInstancesAndVolume({
              lsd: entry.oldLsd,
              freq: entry.oldFreq,
              units: entry.oldUnits,
              rangeStart: nextFyStart,
              rangeEnd: nextFyEnd
            });
            const newNext = countInstancesAndVolume({
              lsd: entry.newLsd,
              freq: entry.newFreq,
              units: entry.newUnits,
              rangeStart: nextFyStart,
              rangeEnd: nextFyEnd
            });

            abpRows.push({
              "MST ID": entry.mstId || "",
              "Std Job No": entry.stdJobNo,
              "Change Type": entry.changeType,
              "ABP Commentary": entry.commentary || "",
              "FY (Current)": `${currentFyStart.getFullYear()}/${String((currentFyStart.getFullYear() + 1) % 100).padStart(2, "0")}`,
              "Old Vol (Curr FY)": oldCurrent.volume,
              "New Vol (Curr FY)": newCurrent.volume,
              "Delta Vol (Curr FY)": newCurrent.volume - oldCurrent.volume,
              "Old Vol (Next FY)": oldNext.volume,
              "New Vol (Next FY)": newNext.volume,
              "Delta Vol (Next FY)": newNext.volume - oldNext.volume,
              "Rough 4-Week Periods (Curr FY New)": formatPeriodVolumes(newCurrent.periodVolumes)
            });
        };

        changeDataForAbp.forEach((row) => {
            const orig = window.originalProps?.[row.MST_ID] || {};
            const stdJobNo = normalizeStdJobNo(row.Std_Job_No || orig["Standard Job Number"] || orig["Std Job No"] || "");
            if (!isAbpStdJob(stdJobNo)) return;

            const deactivated = row.New_Work_Group_Code === "DNXXXXX" || row.New_Scheduling_Indicator_Code === "9";
            addAbpRow({
              mstId: row.MST_ID,
              stdJobNo,
              changeType: deactivated ? "Deactivate MST" : "Amend MST",
              commentary: row.ABP_Commentary || "",
              baseLsd: row.Old_Last_Scheduled_Date || row.New_Last_Scheduled_Date || orig["Last Scheduled Date"],
              oldLsd: row.Old_Last_Scheduled_Date || orig["Last Scheduled Date"],
              oldFreq: row.Old_Frequency || orig["MST Frequency"],
              oldUnits: row.Old_Units_Required || orig["Units Required"],
              newLsd: deactivated ? todayIso : (row.New_Last_Scheduled_Date || row.Old_Last_Scheduled_Date || orig["Last Scheduled Date"]),
              newFreq: deactivated ? row.Old_Frequency || orig["MST Frequency"] : (row.New_Frequency || row.Old_Frequency || orig["MST Frequency"]),
              newUnits: deactivated ? 0 : (row.New_Units_Required || row.Old_Units_Required || orig["Units Required"])
            });
        });

        newDataForAbp.forEach((row) => {
            const stdJobNo = normalizeStdJobNo(row["Std Job No"] || "");
            if (!isAbpStdJob(stdJobNo)) return;

            addAbpRow({
              mstId: "",
              stdJobNo,
              changeType: "New MST",
              commentary: row["ABP Commentary"] || "",
              baseLsd: row["LSD"],
              oldLsd: row["LSD"],
              oldFreq: row["Freq"],
              oldUnits: 0,
              newLsd: row["LSD"],
              newFreq: row["Freq"],
              newUnits: row["Unit Required"]
            });
        });

        if (abpRows.length) {
            const wsAbp = workbook.addWorksheet("ABP Impact Summary");
            wsAbp.columns = [
              { header: "MST ID", key: "MST ID", width: 20 },
              { header: "Std Job No", key: "Std Job No", width: 12 },
              { header: "Change Type", key: "Change Type", width: 16 },
              { header: "ABP Commentary", key: "ABP Commentary", width: 48 },
              { header: "FY (Current)", key: "FY (Current)", width: 14 },
              { header: "Old Vol (Curr FY)", key: "Old Vol (Curr FY)", width: 18 },
              { header: "New Vol (Curr FY)", key: "New Vol (Curr FY)", width: 18 },
              { header: "Delta Vol (Curr FY)", key: "Delta Vol (Curr FY)", width: 18 },
              { header: "Old Vol (Next FY)", key: "Old Vol (Next FY)", width: 18 },
              { header: "New Vol (Next FY)", key: "New Vol (Next FY)", width: 18 },
              { header: "Delta Vol (Next FY)", key: "Delta Vol (Next FY)", width: 18 },
              { header: "Rough 4-Week Periods (Curr FY New)", key: "Rough 4-Week Periods (Curr FY New)", width: 52 }
            ];

            wsAbp.addRow(["ABP volume impact is a rough guide only. Figures are estimated from LSD, frequency, and units across Apr-Mar FY windows."]);
            wsAbp.mergeCells("A1:L1");
            wsAbp.getCell("A1").font = { bold: true, color: { argb: "FF7C2D12" } };
            wsAbp.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } };

            const headerRow = wsAbp.getRow(2);
            wsAbp.columns.forEach((col, idx) => {
              headerRow.getCell(idx + 1).value = col.header;
            });
            headerRow.eachCell((cell) => Object.assign(cell, { style: headerStyle }));

            abpRows.forEach((row) => wsAbp.addRow(row));
            wsAbp.views = [{ state: 'frozen', ySplit: 2 }];
        }

        // ------------------------------------------------------
        // SAVE FILE
        // ------------------------------------------------------
        const buffer = await workbook.xlsx.writeBuffer();
        const safeBatch = batchNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
        saveAs(new Blob([buffer]), `${safeBatch}_MST_Changes.xlsx`);
    };

})();
