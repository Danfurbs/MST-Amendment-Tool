window.formatDateDMY = function(input) {
  if (!input) return "";

  if (input instanceof Date && !isNaN(input)) {
    return String(input.getDate()).padStart(2, "0") + "/" +
           String(input.getMonth() + 1).padStart(2, "0") + "/" +
           input.getFullYear();
  }

  const inputStr = (typeof input === "string") ? input : String(input);

  if (/^\d{8}$/.test(inputStr)) {
    const y = inputStr.slice(0, 4);
    const m = inputStr.slice(4, 6);
    const d = inputStr.slice(6, 8);
    return `${d}/${m}/${y}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(inputStr)) {
    const [y, m, d] = inputStr.split("-");
    return `${d}/${m}/${y}`;
  }

  return inputStr;
};





(function () {

    MST.Export = MST.Export || {};

    MST.Export.exportChanges = async function () {

        const changeKeys = Object.keys(window.changes || {});
        const newKeys = Object.keys(window.createdMSTs || {});
        const batchNumber = document.getElementById("batchNumber").value.trim();

        if (!changeKeys.length && !newKeys.length) {
            alert("No changes or new MSTs to export.");
            return;
        }

        if (!batchNumber) {
            alert("Please enter a Batch Number before exporting.");
            return;
        }

        const workbook = new ExcelJS.Workbook();

        const headerStyle = {
            font: { bold: true, color: { argb: "FFFFFFFF" } },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF10B981" } },
            alignment: { vertical: "middle", horizontal: "center" },
        };

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

            const dateFields = new Set(["Last Scheduled Date"]);

            function safeValue(value, fieldLabel) {
                if (value == null || value === "") return "";
                if (dateFields.has(fieldLabel)) return (window.MST?.Utils?.formatDateDMY || (() => ""))(value);
                return value;
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
                    ["Frequency", "Old_Frequency", "New_Frequency"],
                    ["Last Scheduled Date", "Old_Last_Scheduled_Date", "New_Last_Scheduled_Date"],
                    ["Protection Type Code", "Old_Protection_Type_Code", "New_Protection_Type_Code"],
                    ["Protection Method Code", "Old_Protection_Method_Code", "New_Protection_Method_Code"],
                    ["Units Required", "Old_Units_Required", "New_Units_Required"],
                    ["Segment Mileage From", "Old_Segment_From", "New_Segment_From"],
                    ["Segment Mileage To", "Old_Segment_To", "New_Segment_To"]
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
        }

        // 3️⃣ Sheet: MST Amend
if (changeKeys.length) {

    const changeData = Object.values(window.changes);
    const ws3 = workbook.addWorksheet("MST Amend");

    const headers = [
        "Equipment", "Task No", "Comp Code", "Mod Code", "Job Desc Code",
        "MST Type", "StatutoryMST", "Allow Multiple workorders",
        "MST Desc 1", "MST Desc 2", "Freq", "Unit Required", "Unit of Work",
        "Sched Ind", "Work Group", "Std Job No", "LPD", "LSD", "NSD",
        "Segment From", "Segment To", "Segment UOM", "Assign To",
        "ProtectionType", "ProtectionMethod", "TV Reference", "TV Expiry Date"
    ];

    ws3.columns = headers.map(h => ({ header: h, key: h, width: 18 }));

    changeData.forEach(row => {
        const out = {};
        const orig = window.originalProps[row.MST_ID] || {};

        headers.forEach(h => {

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
                (h === "ProtectionMethod" && (row.New_Protection_Method_Code || row.Old_Protection_Method_Code || orig["Protection Method Code"] || "")) ||
                orig[h] || "";

            if (["LSD", "NSD", "LPD", "TV Expiry Date"].includes(h)) {
                val = window.formatDateDMY(val);
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
            const ws2 = workbook.addWorksheet("Created_MSTs");

            const commonHeaders = [
                "Equipment", "Task No", "Comp Code", "Mod Code", "Job Desc Code",
                "MST Type", "StatutoryMST", "Allow Multiple workorders",
                "MST Desc 1", "MST Desc 2", "Freq", "Unit Required", "Unit of Work",
                "Sched Ind", "Work Group", "Std Job No", "LPD", "LSD", "NSD",
                "Segment From", "Segment To", "Segment UOM", "Assign To",
                "ProtectionType", "ProtectionMethod", "TV Reference", "TV Expiry Date"
            ];

            ws2.columns = headers.map(h => ({ header: h, key: h, width: 18 }));

            newData.forEach(row => {
                const out = {};

                headers.forEach(h => {
                    let val = row[h] ?? "";

                    if (["LSD", "NSD", "LPD", "TV Expiry Date"].includes(h)) {
                        val = window.formatDateDMY(val);
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
