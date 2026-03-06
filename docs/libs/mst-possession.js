(function possessionModule() {
  const STORAGE_KEY = "mst-possession-groups-v1";
  const TYPE_DEFAULTS = {
    weekend: { label: "Weekend", nights: 1, weekday: 6 },
    midweek: { label: "Midweek", nights: 4, weekday: 1 },
    custom: { label: "Custom", nights: 1, weekday: null }
  };

  const state = {
    possessions: [],
    selectedId: null,
    mstFilter: ""
  };

  const ui = {};

  const uid = () => `pos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const safeDate = (value) => {
    if (!value) return "";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "";
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };

  const getBaseMstEvents = () => {
    const events = window.calendar?.getEvents?.() || [];
    return events
      .filter((event) => event?.extendedProps?.instance === 0)
      .map((event) => {
        const props = event.extendedProps || {};
        return {
          mstId: props.mstId,
          desc1: props.desc1 || "",
          desc2: props.desc2 || "",
          equipNo: props.equipmentNo || "",
          workGroup: props.workGroup || "",
          frequency: Number.parseInt(props.frequency || "0", 10) || 0
        };
      })
      .filter((item) => Boolean(item.mstId));
  };

  const load = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        state.possessions = parsed.map((p) => ({
          id: p.id || uid(),
          name: p.name || "New possession",
          type: p.type || "custom",
          anchorDate: safeDate(p.anchorDate),
          frequencyDays: Number.parseInt(p.frequencyDays || "7", 10) || 7,
          nights: Number.parseInt(p.nights || "1", 10) || 1,
          mstIds: Array.isArray(p.mstIds) ? p.mstIds : []
        }));
      }
    } catch (err) {
      console.warn("Failed to load possessions", err);
    }
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.possessions));
  };

  const ensureSelected = () => {
    if (!state.possessions.length) {
      state.selectedId = null;
      return;
    }
    if (!state.selectedId || !state.possessions.some((p) => p.id === state.selectedId)) {
      state.selectedId = state.possessions[0].id;
    }
  };

  const selectedPossession = () => state.possessions.find((p) => p.id === state.selectedId) || null;

  const getMstLabel = (mstId) => {
    const mst = getBaseMstEvents().find((item) => item.mstId === mstId);
    if (!mst) return mstId;
    return `${mst.equipNo || "?"} / ${mst.mstId} — ${mst.desc1 || "No description"}`;
  };

  const applyAlignment = (possession) => {
    if (!possession) return;
    if (!possession.anchorDate) {
      alert("Please set a possession anchor date first.");
      return;
    }

    const updates = {
      lastDate: possession.anchorDate,
      frequency: possession.frequencyDays
    };

    let updated = 0;
    possession.mstIds.forEach((mstId) => {
      if (typeof window.MST?.Editor?.applyBulkEdits === "function") {
        const ok = window.MST.Editor.applyBulkEdits(mstId, updates);
        if (ok) updated += 1;
      }
    });

    if (updated > 0) {
      alert(`Applied possession alignment to ${updated} MST(s).`);
    }
  };

  const updatePossession = (id, patch) => {
    state.possessions = state.possessions.map((p) => (p.id === id ? { ...p, ...patch } : p));
    save();
    render();
  };

  const removePossession = (id) => {
    state.possessions = state.possessions.filter((p) => p.id !== id);
    save();
    ensureSelected();
    render();
  };

  const addPossession = () => {
    const preset = TYPE_DEFAULTS.weekend;
    const possession = {
      id: uid(),
      name: `${preset.label} possession`,
      type: "weekend",
      anchorDate: "",
      frequencyDays: 7,
      nights: preset.nights,
      mstIds: []
    };
    state.possessions.unshift(possession);
    state.selectedId = possession.id;
    save();
    render();
  };

  const handleTypeChange = (possession, type) => {
    const preset = TYPE_DEFAULTS[type] || TYPE_DEFAULTS.custom;
    updatePossession(possession.id, {
      type,
      nights: preset.nights,
      name: possession.name || `${preset.label} possession`
    });
  };

  const setAnchorToWeekday = (possession) => {
    const preset = TYPE_DEFAULTS[possession.type] || TYPE_DEFAULTS.custom;
    if (preset.weekday === null || !possession.anchorDate) return;
    const date = new Date(`${possession.anchorDate}T00:00:00`);
    while (date.getDay() !== preset.weekday) {
      date.setDate(date.getDate() + 1);
    }
    updatePossession(possession.id, { anchorDate: safeDate(date) });
  };

  const addMstToPossession = (mstId, possessionId) => {
    state.possessions = state.possessions.map((p) => {
      const nextIds = p.mstIds.filter((id) => id !== mstId);
      if (p.id === possessionId) nextIds.push(mstId);
      return { ...p, mstIds: nextIds };
    });
    save();
    render();
  };

  const removeMstFromPossession = (mstId, possessionId) => {
    state.possessions = state.possessions.map((p) => (
      p.id === possessionId
        ? { ...p, mstIds: p.mstIds.filter((id) => id !== mstId) }
        : p
    ));
    save();
    render();
  };

  const renderUnassigned = () => {
    const selected = selectedPossession();
    if (!ui.unassignedList) return;

    const assigned = new Set(state.possessions.flatMap((p) => p.mstIds));
    const allMsts = getBaseMstEvents();
    const filter = state.mstFilter.trim().toLowerCase();
    const rows = allMsts.filter((mst) => {
      if (assigned.has(mst.mstId)) return false;
      if (!filter) return true;
      return `${mst.equipNo} ${mst.mstId} ${mst.desc1} ${mst.desc2}`.toLowerCase().includes(filter);
    });

    ui.unassignedList.innerHTML = "";
    rows.slice(0, 250).forEach((mst) => {
      const row = document.createElement("div");
      row.className = "possession-mst-chip";
      row.draggable = true;
      row.dataset.mstId = mst.mstId;
      row.innerHTML = `<strong>${mst.equipNo || "?"}</strong><span>${mst.desc1 || mst.mstId}</span>`;
      row.addEventListener("dragstart", (evt) => {
        evt.dataTransfer?.setData("text/plain", mst.mstId);
      });
      if (!selected) row.classList.add("muted");
      ui.unassignedList.appendChild(row);
    });

    ui.unassignedCount.textContent = `${rows.length} unassigned MSTs`;
  };

  const renderPossessionList = () => {
    ui.possessionList.innerHTML = "";
    state.possessions.forEach((possession) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `possession-item ${possession.id === state.selectedId ? "active" : ""}`;
      btn.textContent = `${possession.name || "Untitled"} (${possession.mstIds.length})`;
      btn.addEventListener("click", () => {
        state.selectedId = possession.id;
        render();
      });
      ui.possessionList.appendChild(btn);
    });
  };

  const renderSelectedPossession = () => {
    const possession = selectedPossession();
    if (!possession) {
      ui.possessionEditor.innerHTML = '<div class="muted-helper">Create a possession to start grouping MSTs.</div>';
      return;
    }

    ui.possessionEditor.innerHTML = `
      <div class="possession-grid">
        <label>Name<input id="possessionNameInput" value="${possession.name.replace(/"/g, "&quot;")}" /></label>
        <label>Type
          <select id="possessionTypeInput">
            <option value="weekend" ${possession.type === "weekend" ? "selected" : ""}>Weekend (Saturday night)</option>
            <option value="midweek" ${possession.type === "midweek" ? "selected" : ""}>Midweek (4 nights)</option>
            <option value="custom" ${possession.type === "custom" ? "selected" : ""}>Custom</option>
          </select>
        </label>
        <label>Anchor date<input id="possessionAnchorInput" type="date" value="${possession.anchorDate || ""}" /></label>
        <label>Frequency (days)<input id="possessionFreqInput" type="number" min="1" value="${possession.frequencyDays}" /></label>
        <label>Nights<input id="possessionNightsInput" type="number" min="1" value="${possession.nights}" /></label>
      </div>
      <div class="possession-actions-row">
        <button type="button" id="snapWeekdayBtn">Snap to default weekday</button>
        <button type="button" id="applyPossessionBtn">Apply to grouped MSTs</button>
        <button type="button" id="deletePossessionBtn" class="danger">Delete possession</button>
      </div>
      <div class="muted-helper">Drop MST chips into this area to group them. Updating date/frequency here and clicking apply updates all grouped MSTs.</div>
      <div id="possessionDropZone" class="possession-drop-zone">Drop MSTs here</div>
      <div id="possessionMstList" class="possession-mst-list"></div>
    `;

    const nameInput = document.getElementById("possessionNameInput");
    const typeInput = document.getElementById("possessionTypeInput");
    const anchorInput = document.getElementById("possessionAnchorInput");
    const freqInput = document.getElementById("possessionFreqInput");
    const nightsInput = document.getElementById("possessionNightsInput");

    nameInput?.addEventListener("input", () => updatePossession(possession.id, { name: nameInput.value }));
    typeInput?.addEventListener("change", () => handleTypeChange(possession, typeInput.value));
    anchorInput?.addEventListener("change", () => updatePossession(possession.id, { anchorDate: anchorInput.value }));
    freqInput?.addEventListener("change", () => {
      const frequencyDays = Math.max(1, Number.parseInt(freqInput.value || "1", 10));
      updatePossession(possession.id, { frequencyDays });
    });
    nightsInput?.addEventListener("change", () => {
      const nights = Math.max(1, Number.parseInt(nightsInput.value || "1", 10));
      updatePossession(possession.id, { nights });
    });

    document.getElementById("snapWeekdayBtn")?.addEventListener("click", () => setAnchorToWeekday(possession));
    document.getElementById("applyPossessionBtn")?.addEventListener("click", () => applyAlignment(selectedPossession()));
    document.getElementById("deletePossessionBtn")?.addEventListener("click", () => removePossession(possession.id));

    const dropZone = document.getElementById("possessionDropZone");
    const listEl = document.getElementById("possessionMstList");

    dropZone?.addEventListener("dragover", (evt) => {
      evt.preventDefault();
      dropZone.classList.add("is-over");
    });
    dropZone?.addEventListener("dragleave", () => dropZone.classList.remove("is-over"));
    dropZone?.addEventListener("drop", (evt) => {
      evt.preventDefault();
      dropZone.classList.remove("is-over");
      const mstId = evt.dataTransfer?.getData("text/plain");
      if (mstId) addMstToPossession(mstId, possession.id);
    });

    possession.mstIds.forEach((mstId) => {
      const chip = document.createElement("div");
      chip.className = "possession-group-chip";
      chip.innerHTML = `<span>${getMstLabel(mstId)}</span><button type="button" data-mst-id="${mstId}">Remove</button>`;
      chip.querySelector("button")?.addEventListener("click", () => removeMstFromPossession(mstId, possession.id));
      listEl?.appendChild(chip);
    });
  };

  const render = () => {
    ensureSelected();
    renderPossessionList();
    renderSelectedPossession();
    renderUnassigned();
  };

  const init = () => {
    ui.root = document.getElementById("possessionAlignment");
    if (!ui.root) return;

    ui.possessionList = document.getElementById("possessionList");
    ui.possessionEditor = document.getElementById("possessionEditor");
    ui.unassignedList = document.getElementById("unassignedMstList");
    ui.unassignedCount = document.getElementById("unassignedMstCount");
    ui.searchInput = document.getElementById("possessionMstSearch");

    document.getElementById("addPossessionBtn")?.addEventListener("click", addPossession);
    document.getElementById("refreshPossessionBtn")?.addEventListener("click", render);
    ui.searchInput?.addEventListener("input", () => {
      state.mstFilter = ui.searchInput.value || "";
      renderUnassigned();
    });

    load();
    render();

    window.MST = window.MST || {};
    window.MST.Possession = {
      render,
      addMstToPossession,
      applyAlignment
    };
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
