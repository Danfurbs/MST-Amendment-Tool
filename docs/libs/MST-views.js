(function initMSTViews() {
  const Utils = (window.MST && window.MST.Utils) || {};

  function getEl(id) {
    return document.getElementById(id);
  }

  function setupFilters() {
    const filterOverlay   = getEl('filterOverlay');
    const closeFilterBtn  = getEl('closeFilterBtn');
    const openFilterBtn   = getEl('openFilterBtn');
    const applyFiltersBtn = getEl('applyFiltersBtn');
    const resetFiltersBtn = getEl('resetFiltersBtn');
    const filterWorkGroup = getEl('filterWorkGroup');
    const filterJobDesc   = getEl('filterJobDesc');
    const filterDesc1     = getEl('filterDesc1');
    const filterDesc2     = getEl('filterDesc2');
    const filterProtType  = getEl('filterProtType');
    const filterProtMethod= getEl('filterProtMethod');
    const filterEquipDesc1= getEl('filterEquipDesc1');

    if (!filterOverlay || !openFilterBtn || !closeFilterBtn) return;

    function applyFilters() {
      const calendar = window.calendar;
      if (!calendar) return;

      const visibleDisplay = calendar.getOption('eventDisplay') || 'block';

      const wg  = (filterWorkGroup?.value || '').trim();
      const jd  = (filterJobDesc?.value || '').trim().split(' — ')[0];
      const d1  = (filterDesc1?.value || '').trim();
      const d2  = (filterDesc2?.value || '').trim();
      const pt  = (filterProtType?.value || '').trim().split(' — ')[0];
      const pm  = (filterProtMethod?.value || '').trim().split(' — ')[0];
      const ad1 = (filterEquipDesc1?.value || '').trim();

      const noActive = !wg && !jd && !d1 && !d2 && !pt && !pm && !ad1;

      const events = calendar.getEvents();
      const bases  = events.filter((e) => (e.extendedProps || {}).instance === 0);

      calendar.batchRendering(() => {
        if (noActive) {
          events.forEach((e) => {
            if (e.display !== visibleDisplay) e.setProp('display', visibleDisplay);
          });
          return;
        }

        const visibilityByMstId = new Map();

        bases.forEach((base) => {
          const p = base.extendedProps || {};
          const match =
            (!wg  || (p.workGroup      || '').trim() === wg) &&
            (!jd  || (p.jobDescCode    || '').trim() === jd) &&
            (!d1  || (p.desc1          || '').trim() === d1) &&
            (!d2  || (p.desc2          || '').trim() === d2) &&
            (!pt  || (p.protType       || '').trim() === pt) &&
            (!pm  || (p.protMethod     || '').trim() === pm) &&
            (!ad1 || (p.equipmentDesc1 || '').trim() === ad1);

          visibilityByMstId.set(p.mstId, match);
        });

        events.forEach((ev) => {
          const mid = (ev.extendedProps || {}).mstId;
          const show = visibilityByMstId.get(mid) === true;
          const desired = show ? visibleDisplay : 'none';
          if (ev.display !== desired) ev.setProp('display', desired);
        });
      });
    }

    function resetFilters() {
      if (filterWorkGroup) filterWorkGroup.value = '';
      if (filterJobDesc)   filterJobDesc.value   = '';
      if (filterDesc1)     filterDesc1.value     = '';
      if (filterDesc2)     filterDesc2.value     = '';
      if (filterProtType)  filterProtType.value  = '';
      if (filterProtMethod)filterProtMethod.value= '';
      if (filterEquipDesc1)filterEquipDesc1.value= '';

      const calendar = window.calendar;
      if (!calendar) return;

      const visibleDisplay = calendar.getOption('eventDisplay') || 'block';

      calendar.batchRendering(() => {
        calendar.getEvents().forEach((e) => {
          if (e.display !== visibleDisplay) e.setProp('display', visibleDisplay);
        });
      });
    }

    openFilterBtn.addEventListener('click', () => filterOverlay.classList.add('active'));
    closeFilterBtn.addEventListener('click', () => filterOverlay.classList.remove('active'));
    filterOverlay.addEventListener('click', (e) => {
      if (e.target === filterOverlay) filterOverlay.classList.remove('active');
    });
    applyFiltersBtn?.addEventListener('click', () => {
      applyFilters();
      filterOverlay.classList.remove('active');
    });
    resetFiltersBtn?.addEventListener('click', () => {
      resetFilters();
      filterOverlay.classList.remove('active');
    });

    window.MST = window.MST || {};
    window.MST.Views = window.MST.Views || {};
    window.MST.Views.applyFilters = applyFilters;
    window.MST.Views.resetFilters = resetFilters;
  }

  function deriveMstId(row) {
    if (!row) return '';
    const concat = (row['CONCAT'] || '').toString().trim();
    if (concat) return concat;

    const eq = (row['Equipment Number'] || '').toString().trim();
    const tn = (row['MST Task Number'] || '').toString().padStart(3, '0');
    if (eq && tn) return `${eq}_${tn}`;

    return '';
  }

  function setupFlaggedListView() {
    const calendarEl      = getEl('calendarEl');
    const listView        = getEl('flaggedListView');
    const listTitle       = getEl('flaggedListTitle');
    const listBody        = getEl('flaggedListBody');
    const backToCalendar  = getEl('backToCalendarBtn');

    const rules = Array.isArray(window.MST?.ErrorFlags?.rules)
      ? window.MST.ErrorFlags.rules
      : [];

    const showCalendar = () => {
      if (calendarEl) calendarEl.style.display = '';
      if (listView) listView.style.display = 'none';
    };

    const showFlaggedList = (ruleId) => {
      if (!listView || !listBody) return;

      const flaggedMap = window.mstErrorFlaggedMap || {};
      const rows = flaggedMap[ruleId] || [];
      const rule = rules.find(r => r.id === ruleId);

      listBody.innerHTML = '';
      if (listTitle) {
        listTitle.textContent = rule
          ? `${rule.description || rule.id} (${rows.length})`
          : `Flagged MSTs (${rows.length})`;
      }

      if (!rows.length) {
        const empty = document.createElement('li');
        empty.textContent = 'No MSTs were flagged for this rule.';
        listBody.appendChild(empty);
      } else {
        rows.forEach(row => {
          const mstId = deriveMstId(row);
          const li = document.createElement('li');
          li.className = 'flagged-row';
          li.innerHTML = `
            <div class="title">${row['MST Description 1'] || ''}</div>
            <div class="meta">
              ${row['Equipment Number'] || ''} · Task ${row['MST Task Number'] || ''} · ${row['Last Scheduled Date'] || ''}
            </div>
          `;

          li.addEventListener('click', () => {
            if (!mstId) return;
            const baseEvent = window.calendar?.getEventById(`${mstId}_0`);
            if (baseEvent && typeof window.MST?.Editor?.openEditorForMST === 'function') {
              window.MST.Editor.openEditorForMST(mstId, baseEvent);
              if (window.calendar) {
                window.calendar.gotoDate(baseEvent.start);
              }
            }
          });

          listBody.appendChild(li);
        });
      }

      if (calendarEl) calendarEl.style.display = 'none';
      listView.style.display = 'block';
    };

    backToCalendar?.addEventListener('click', showCalendar);

    window.MST = window.MST || {};
    window.MST.Views = window.MST.Views || {};
    window.MST.Views.showFlaggedList = showFlaggedList;
    window.MST.Views.showCalendar = showCalendar;
  }

  function setupGoto() {
    const gotoOverlay     = getEl('gotoOverlay');
    const gotoPanel       = getEl('gotoPanel');
    const openGotoBtn     = getEl('openGotoBtn');
    const closeGotoBtn    = getEl('closeGotoBtn');
    const closeGotoBtn2   = getEl('closeGotoBtn2');

    const gotoEquip       = getEl('gotoEquip');
    const gotoSearchBtn   = getEl('gotoSearchBtn');
    const gotoResults     = getEl('gotoResults');
    const gotoResultsBody = getEl('gotoResultsBody');
    const equipList       = getEl('equipList');

    if (!gotoOverlay || !gotoPanel || !openGotoBtn || !closeGotoBtn || !gotoEquip) return;

    const normalizeEquip = (value) => {
      if (typeof Utils.normalizeEquip === 'function') return Utils.normalizeEquip(value);
      return (value || '').toString().toUpperCase().replace(/^0+/, '');
    };

    function openGoto()  { gotoOverlay.classList.add('active'); setTimeout(() => gotoEquip.focus(), 0); }
    function closeGoto() {
      gotoOverlay.classList.remove('active');
      if (gotoResultsBody) gotoResultsBody.innerHTML = '';
      if (gotoResults) gotoResults.style.display = 'none';
      gotoEquip.value = '';
    }

    function renderResults(events) {
      if (!gotoResultsBody || !gotoResults) return;
      gotoResultsBody.innerHTML = '';

      events.forEach((ev) => {
        const p  = ev.extendedProps || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.taskNo || ''}</td><td>${p.desc1 || ''}</td>`;
        tr.addEventListener('click', () => {
          const mstId = p.mstId;
          const calendar = window.calendar;
          if (!calendar) return;

          calendar.gotoDate(ev.start);

          setTimeout(() => {
            if (window.MST?.Editor?.openEditorForMST) {
              window.MST.Editor.openEditorForMST(mstId, ev);
            }

            const el = calendar.getEventById(`${mstId}_0`)?.el;
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.classList.add('goto-flash');
              setTimeout(() => el.classList.remove('goto-flash'), 2000);
            }

            const sidebar = document.getElementById('sidebar');
            if (sidebar) {
              sidebar.classList.add('pulse-highlight');
              setTimeout(() => sidebar.classList.remove('pulse-highlight'), 1200);
            }
          }, 300);

          closeGoto();
        });

        gotoResultsBody.appendChild(tr);
      });

      gotoResults.style.display = 'block';
    }

    function performSearch() {
      const calendar = window.calendar;
      if (!calendar) return;

      const equip = gotoEquip.value.trim().toUpperCase();
      if (!equip) { alert('Please enter an Equipment Number.'); return; }

      const events = calendar.getEvents().filter((ev) => {
        const p = ev.extendedProps || {};
        return normalizeEquip(p.equipmentNo) === normalizeEquip(equip) && ev.id.endsWith('_0');
      });

      if (!events.length) {
        if (gotoResults) gotoResults.style.display = 'none';
        alert('No MSTs found for that Equipment.');
        return;
      }

      renderResults(events);
    }

    openGotoBtn.addEventListener('click', openGoto);
    closeGotoBtn.addEventListener('click', closeGoto);
    closeGotoBtn2?.addEventListener('click', closeGoto);
    gotoOverlay.addEventListener('click', (e) => { if (e.target === gotoOverlay) closeGoto(); });

    gotoSearchBtn?.addEventListener('click', performSearch);
    gotoEquip.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });

    gotoEquip.addEventListener('input', (e) => {
      if (!equipList) return;
      const term = normalizeEquip(e.target.value || '');
      equipList.innerHTML = '';
      if (!term) return;

      (window.allEquipNumbers || [])
        .filter((eq) => normalizeEquip(eq).includes(term))
        .slice(0, 25)
        .forEach((eq) => {
          const opt = document.createElement('option');
          opt.value = eq;
          equipList.appendChild(opt);
        });
    });

    window.MST = window.MST || {};
    window.MST.Views = window.MST.Views || {};
    window.MST.Views.openGoto = openGoto;
    window.MST.Views.closeGoto = closeGoto;
  }

  function setupBulkUpdate() {
    const openBulkBtn = getEl('openBulkUpdateBtn');
    const overlay = getEl('bulkUpdateOverlay');
    const panel = getEl('bulkUpdatePanel');
    const closeBulkBtn = getEl('closeBulkUpdateBtn');
    const cancelBulkBtn = getEl('bulkCancelBtn');
    const filterInput = getEl('bulkFilterInput');
    const selectAll = getEl('bulkSelectAll');
    const listBody = getEl('bulkListBody');
    const selectedCount = getEl('bulkSelectedCount');
    const openEditorBtn = getEl('bulkOpenEditorBtn');

    const editOverlay = getEl('bulkEditOverlay');
    const editPanel = getEl('bulkEditPanel');
    const closeEditBtn = getEl('closeBulkEditBtn');
    const backBtn = getEl('bulkBackBtn');
    const applyBtn = getEl('bulkApplyBtn');
    const editBody = getEl('bulkEditBody');
    const editCount = getEl('bulkEditCount');

    if (!openBulkBtn || !overlay || !panel || !listBody || !editOverlay || !editBody) return;

    const selected = new Set();

    const getVisibleBaseEvents = () => {
      const calendar = window.calendar;
      if (!calendar) return [];
      return calendar.getEvents().filter((ev) => {
        const props = ev.extendedProps || {};
        return props.instance === 0 && ev.display !== 'none';
      });
    };

    const normalizeText = (value) => (value || '').toString().toLowerCase();

    const makeFilterText = (props) => [
      props.equipmentNo,
      props.taskNo,
      props.desc1,
      props.desc2,
      props.workGroup,
      props.jobDescCode
    ].map(normalizeText).join(' ');

    const updateSelectedCount = () => {
      if (selectedCount) selectedCount.textContent = `${selected.size}`;
    };

    const syncSelectAll = (filteredEvents) => {
      if (!selectAll) return;
      if (!filteredEvents.length) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
      }
      const selectedVisible = filteredEvents.every((ev) => selected.has(ev.extendedProps?.mstId));
      const someSelected = filteredEvents.some((ev) => selected.has(ev.extendedProps?.mstId));
      selectAll.checked = selectedVisible;
      selectAll.indeterminate = !selectedVisible && someSelected;
    };

    const renderList = () => {
      if (!listBody) return;
      listBody.innerHTML = '';
      const term = normalizeText(filterInput?.value);
      const events = getVisibleBaseEvents()
        .filter((ev) => {
          if (!term) return true;
          return makeFilterText(ev.extendedProps || {}).includes(term);
        })
        .sort((a, b) => {
          const aKey = `${a.extendedProps?.equipmentNo || ''}${a.extendedProps?.taskNo || ''}`;
          const bKey = `${b.extendedProps?.equipmentNo || ''}${b.extendedProps?.taskNo || ''}`;
          return aKey.localeCompare(bKey);
        });

      events.forEach((ev) => {
        const props = ev.extendedProps || {};
        const mstId = props.mstId;
        const tr = document.createElement('tr');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = selected.has(mstId);
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            selected.add(mstId);
          } else {
            selected.delete(mstId);
          }
          updateSelectedCount();
          syncSelectAll(events);
        });

        const dateValue = Utils?.dateToInputYYYYMMDD
          ? Utils.dateToInputYYYYMMDD(ev.start)
          : '';

        tr.innerHTML = `
          <td></td>
          <td>${props.equipmentNo || ''}</td>
          <td>${props.taskNo || ''}</td>
          <td>${props.desc1 || ''}</td>
          <td>${props.workGroup || ''}</td>
          <td>${dateValue || ''}</td>
        `;
        tr.querySelector('td')?.appendChild(checkbox);
        listBody.appendChild(tr);
      });

      updateSelectedCount();
      syncSelectAll(events);
    };

    const openOverlay = ({ resetSelection = true, resetFilter = true } = {}) => {
      if (resetFilter && filterInput) filterInput.value = '';
      if (resetSelection) {
        selected.clear();
        updateSelectedCount();
      }
      if (selectAll && resetSelection) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
      }
      renderList();
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
    };

    const closeOverlay = () => {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
    };

    const openEditor = () => {
      if (!selected.size) {
        alert('Select at least one MST to edit.');
        return;
      }
      const calendar = window.calendar;
      if (!calendar) return;

      const sourceJobSelect = document.getElementById('jobDescCodeInput');
      const sourceProtType = document.getElementById('protTypeInput');
      const sourceProtMethod = document.getElementById('protMethodInput');

      const cloneSelectOptions = (source) => {
        const select = document.createElement('select');
        if (!source) return select;
        Array.from(source.options || []).forEach((opt) => {
          const newOpt = document.createElement('option');
          newOpt.value = opt.value;
          newOpt.textContent = opt.textContent;
          select.appendChild(newOpt);
        });
        return select;
      };

      const events = Array.from(selected)
        .map((mstId) => calendar.getEventById(`${mstId}_0`))
        .filter(Boolean)
        .sort((a, b) => {
          const aKey = `${a.extendedProps?.equipmentNo || ''}${a.extendedProps?.taskNo || ''}`;
          const bKey = `${b.extendedProps?.equipmentNo || ''}${b.extendedProps?.taskNo || ''}`;
          return aKey.localeCompare(bKey);
        });

      if (editCount) editCount.textContent = `${events.length}`;
      editBody.innerHTML = '';

      events.forEach((ev) => {
        const props = ev.extendedProps || {};
        const tr = document.createElement('tr');
        tr.dataset.mstId = props.mstId;

        const desc2Input = document.createElement('input');
        desc2Input.type = 'text';
        desc2Input.maxLength = 45;
        desc2Input.value = props.desc2 || '';

        const freqInput = document.createElement('input');
        freqInput.type = 'number';
        freqInput.min = '0';
        freqInput.value = props.frequency ?? '';

        const dateInput = document.createElement('input');
        dateInput.type = 'date';
        dateInput.value = Utils?.dateToInputYYYYMMDD ? Utils.dateToInputYYYYMMDD(ev.start) : '';

        const wgInput = document.createElement('input');
        wgInput.type = 'text';
        wgInput.value = props.workGroup || '';

        const jobSelect = cloneSelectOptions(sourceJobSelect);
        jobSelect.value = props.jobDescCode || '';

        const unitsInput = document.createElement('input');
        unitsInput.type = 'number';
        unitsInput.min = '0';
        unitsInput.value = props.unitsRequired ?? '';

        const segFromInput = document.createElement('input');
        segFromInput.type = 'number';
        segFromInput.min = '0';
        segFromInput.value = props.segFrom ?? '';

        const segToInput = document.createElement('input');
        segToInput.type = 'number';
        segToInput.min = '0';
        segToInput.value = props.segTo ?? '';

        const protTypeSelect = cloneSelectOptions(sourceProtType);
        protTypeSelect.value = props.protType || '';

        const protMethodSelect = cloneSelectOptions(sourceProtMethod);
        protMethodSelect.value = props.protMethod || '';

        const allowMultipleInput = document.createElement('input');
        allowMultipleInput.type = 'checkbox';
        allowMultipleInput.checked = (props.allowMultiple || '').toString().toUpperCase() === 'YES';

        tr.innerHTML = `
          <td>${props.equipmentNo || ''}</td>
          <td>${props.taskNo || ''}</td>
          <td>${props.desc1 || ''}</td>
        `;

        const cells = [
          desc2Input,
          freqInput,
          dateInput,
          wgInput,
          jobSelect,
          unitsInput,
          segFromInput,
          segToInput,
          protTypeSelect,
          protMethodSelect,
          allowMultipleInput
        ];

        cells.forEach((input) => {
          const td = document.createElement('td');
          td.appendChild(input);
          tr.appendChild(td);
        });

        editBody.appendChild(tr);
      });

      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      editOverlay.classList.add('active');
      editOverlay.setAttribute('aria-hidden', 'false');
    };

    const closeEditor = () => {
      editOverlay.classList.remove('active');
      editOverlay.setAttribute('aria-hidden', 'true');
    };

    const applyBulkUpdates = () => {
      if (!window.MST?.Editor?.applyBulkEdits) {
        alert('Bulk update is unavailable. Please refresh and try again.');
        return;
      }
      const rows = Array.from(editBody.querySelectorAll('tr[data-mst-id]'));
      let updated = 0;
      rows.forEach((row) => {
        const mstId = row.dataset.mstId;
        const inputs = row.querySelectorAll('input, select');
        const updates = {
          desc2: inputs[0]?.value ?? '',
          frequency: inputs[1]?.value ?? '',
          lastDate: inputs[2]?.value ?? '',
          workGroup: inputs[3]?.value ?? '',
          jobDescCode: inputs[4]?.value ?? '',
          unitsRequired: inputs[5]?.value ?? '',
          segFrom: inputs[6]?.value ?? '',
          segTo: inputs[7]?.value ?? '',
          protType: inputs[8]?.value ?? '',
          protMethod: inputs[9]?.value ?? '',
          allowMultiple: inputs[10]?.checked ?? false
        };
        const result = window.MST.Editor.applyBulkEdits(mstId, updates);
        if (result) updated += 1;
      });

      alert(`Updated ${updated} MST${updated === 1 ? '' : 's'}.`);
      closeEditor();
      openOverlay({ resetSelection: true, resetFilter: true });
    };

    openBulkBtn.addEventListener('click', () => openOverlay({ resetSelection: true, resetFilter: true }));
    closeBulkBtn?.addEventListener('click', closeOverlay);
    cancelBulkBtn?.addEventListener('click', closeOverlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });

    editOverlay.addEventListener('click', (e) => {
      if (e.target === editOverlay) closeEditor();
    });

    filterInput?.addEventListener('input', renderList);

    selectAll?.addEventListener('change', () => {
      const events = getVisibleBaseEvents().filter((ev) => {
        const term = normalizeText(filterInput?.value);
        if (!term) return true;
        return makeFilterText(ev.extendedProps || {}).includes(term);
      });
      if (selectAll.checked) {
        events.forEach((ev) => selected.add(ev.extendedProps?.mstId));
      } else {
        events.forEach((ev) => selected.delete(ev.extendedProps?.mstId));
      }
      renderList();
    });

    openEditorBtn?.addEventListener('click', openEditor);
    closeEditBtn?.addEventListener('click', closeEditor);
    backBtn?.addEventListener('click', () => {
      closeEditor();
      openOverlay({ resetSelection: false, resetFilter: false });
    });
    applyBtn?.addEventListener('click', applyBulkUpdates);
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    setupGoto();
    setupFlaggedListView();
    setupBulkUpdate();
  });
})();
