const formatDateDMY = (value) => {
  if (window.MST?.Utils?.formatDateDMY) return window.MST.Utils.formatDateDMY(value);
  return value ?? "";
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




(function () {

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
        // SAVE FILE
        // ------------------------------------------------------
        const buffer = await workbook.xlsx.writeBuffer();
        const safeBatch = batchNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
        saveAs(new Blob([buffer]), `${safeBatch}_MST_Changes.xlsx`);
    };

})();
