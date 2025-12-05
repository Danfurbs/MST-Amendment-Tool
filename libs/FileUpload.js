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
    const vals = [...new Set(rows.map(r => (r[field] || "").trim()))].sort();

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
  const loading   = document.getElementById("loading");

  if (!fileInput) {
    console.error("❌ FileUpload.js: #fileInput not found in DOM");
    return;
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

        // Save master rows
        window.originalRows = json;

        // ========= Work Group Modal =========
        const wgSelectModal    = document.getElementById("wgSelectModal");
        const wgSelectDropdown = document.getElementById("wgSelectDropdown");

        const wgPairs = new Map();
        json.forEach(r => {
          const code = (r["Work Group Set Code"] || "").trim();
          const desc = (r["Work Group Description"] || "").trim();
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

          const filtered = json.filter(r =>
            selected.includes((r["Work Group Set Code"] || "").trim())
          );

          window.originalRows = filtered;

          populateUnique(document.getElementById("filterWorkGroup"),  filtered, "Work Group Code");
          populateUnique(document.getElementById("filterJobDesc"),    filtered, "Job Description Code");
          populateUnique(document.getElementById("filterDesc1"),      filtered, "MST Description 1");
          populateUnique(document.getElementById("filterDesc2"),      filtered, "MST Description 2");
          populateUnique(document.getElementById("filterProtType"),   filtered, "Protection Type Code");
          populateUnique(document.getElementById("filterProtMethod"), filtered, "Protection Method Code");
          populateUnique(document.getElementById("filterEquipDesc1"), filtered, "Equipment Description 1");

          window.allEquipNumbers = [...new Set(
            filtered.map(r => (r["Equipment Number"] || "").toString().trim())
          )];

          MST.Editor.loadMSTs(filtered);
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

});
