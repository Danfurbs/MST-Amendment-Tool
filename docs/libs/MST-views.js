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

    const gotoSearch      = getEl('gotoSearch');
    const gotoEquip       = getEl('gotoEquip');
    const gotoTask        = getEl('gotoTask');
    const gotoSearchBtn   = getEl('gotoSearchBtn');
    const gotoResults     = getEl('gotoResults');
    const gotoResultsBody = getEl('gotoResultsBody');
    const gotoResultsCount = getEl('gotoResultsCount');
    const equipList       = getEl('equipList');

    if (!gotoOverlay || !gotoPanel || !openGotoBtn || !closeGotoBtn) return;

    const normalizeEquip = (value) => {
      if (typeof Utils.normalizeEquip === 'function') return Utils.normalizeEquip(value);
      return (value || '').toString().toUpperCase().replace(/^0+/, '');
    };

    const normalizeText = (value) => (value || '').toString().toLowerCase().trim();

    function openGoto() {
      gotoOverlay.classList.add('active');
      setTimeout(() => (gotoSearch || gotoEquip)?.focus(), 0);
    }

    function closeGoto() {
      gotoOverlay.classList.remove('active');
      if (gotoResultsBody) gotoResultsBody.innerHTML = '';
      if (gotoResults) gotoResults.style.display = 'none';
      if (gotoResultsCount) gotoResultsCount.textContent = '';
      if (gotoSearch) gotoSearch.value = '';
      if (gotoEquip) gotoEquip.value = '';
      if (gotoTask) gotoTask.value = '';
    }

    function renderResults(events) {
      if (!gotoResultsBody || !gotoResults) return;
      gotoResultsBody.innerHTML = '';

      // Show count
      if (gotoResultsCount) {
        gotoResultsCount.textContent = `Found ${events.length} MST${events.length === 1 ? '' : 's'}`;
      }

      events.forEach((ev) => {
        const p  = ev.extendedProps || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${p.equipmentNo || ''}</td>
          <td>${p.taskNo || ''}</td>
          <td>${p.desc1 || ''}${p.desc2 ? ' — ' + p.desc2 : ''}</td>
          <td>${p.workGroup || ''}</td>
        `;
        tr.style.cursor = 'pointer';
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

      const searchTerm = normalizeText(gotoSearch?.value || '');
      const equipFilter = normalizeEquip(gotoEquip?.value || '');
      const taskFilter = normalizeText(gotoTask?.value || '');

      // Must have at least one search criterion
      if (!searchTerm && !equipFilter && !taskFilter) {
        alert('Please enter a search term, equipment number, or task number.');
        return;
      }

      const events = calendar.getEvents().filter((ev) => {
        const p = ev.extendedProps || {};

        // Only search base events (instance 0)
        if (!ev.id.endsWith('_0')) return false;

        // Apply equipment filter if provided
        if (equipFilter && !normalizeEquip(p.equipmentNo).includes(equipFilter)) {
          return false;
        }

        // Apply task filter if provided
        if (taskFilter && !normalizeText(p.taskNo).includes(taskFilter)) {
          return false;
        }

        // Apply general search term across all fields
        if (searchTerm) {
          const searchableFields = [
            p.equipmentNo || '',
            p.equipmentDesc1 || '',
            p.taskNo || '',
            p.desc1 || '',
            p.desc2 || '',
            p.workGroup || '',
            p.jobDescCode || '',
            p.protType || '',
            p.protMethod || '',
            p.mstId || ''
          ].map(normalizeText).join(' ');

          if (!searchableFields.includes(searchTerm)) {
            return false;
          }
        }

        return true;
      });

      if (!events.length) {
        if (gotoResults) gotoResults.style.display = 'none';
        if (gotoResultsCount) gotoResultsCount.textContent = '';
        alert('No MSTs found matching your search.');
        return;
      }

      // Sort results by equipment number then task number
      events.sort((a, b) => {
        const aKey = `${a.extendedProps?.equipmentNo || ''}_${a.extendedProps?.taskNo || ''}`;
        const bKey = `${b.extendedProps?.equipmentNo || ''}_${b.extendedProps?.taskNo || ''}`;
        return aKey.localeCompare(bKey);
      });

      // Limit results to prevent performance issues
      const limitedEvents = events.slice(0, 100);
      if (events.length > 100 && gotoResultsCount) {
        gotoResultsCount.textContent = `Found ${events.length} MSTs (showing first 100)`;
      }

      renderResults(limitedEvents);
    }

    openGotoBtn.addEventListener('click', openGoto);
    closeGotoBtn.addEventListener('click', closeGoto);
    closeGotoBtn2?.addEventListener('click', closeGoto);
    gotoOverlay.addEventListener('click', (e) => { if (e.target === gotoOverlay) closeGoto(); });

    gotoSearchBtn?.addEventListener('click', performSearch);

    // Search on Enter key for all input fields
    [gotoSearch, gotoEquip, gotoTask].forEach(input => {
      input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') performSearch(); });
    });

    // Equipment autocomplete
    gotoEquip?.addEventListener('input', (e) => {
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

      const buildSelectFromList = (items, formatLabel) => {
        const select = document.createElement('select');
        select.appendChild(new Option('', '', true, false));
        items.forEach((item) => {
          const opt = document.createElement('option');
          opt.value = item.code ?? item.value ?? item;
          opt.textContent = formatLabel ? formatLabel(item) : opt.value;
          select.appendChild(opt);
        });
        return select;
      };

      const cloneSelectOptions = (source, fallbackItems, formatLabel) => {
        const sourceOptions = source?.options ? Array.from(source.options) : [];
        if (!sourceOptions.length) {
          return buildSelectFromList(fallbackItems, formatLabel);
        }
        const select = document.createElement('select');
        sourceOptions.forEach((opt) => {
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

        const jobSelect = cloneSelectOptions(
          sourceJobSelect,
          window.MST_VARIABLES?.jobDescCodes || [],
          (item) => `${item.code} — ${item.desc}`
        );
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

        const protTypeSelect = cloneSelectOptions(
          sourceProtType,
          window.MST_VARIABLES?.protectionTypes || [],
          (item) => item.desc
        );
        const protTypeValue = (props.protType ?? '').toString();
        protTypeSelect.value = protTypeValue ? protTypeValue.padStart(2, '0') : '';

        const protMethodSelect = cloneSelectOptions(
          sourceProtMethod,
          window.MST_VARIABLES?.protectionMethods || [],
          (item) => item.desc
        );
        const protMethodValue = (props.protMethod ?? '').toString();
        protMethodSelect.value = protMethodValue ? protMethodValue.padStart(2, '0') : '';

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

    // Preview overlay elements
    const previewOverlay = getEl('bulkPreviewOverlay');
    const previewBody = getEl('bulkPreviewBody');
    const previewSummary = getEl('bulkPreviewSummary');
    const closePreviewBtn = getEl('closeBulkPreviewBtn');
    const previewCancelBtn = getEl('bulkPreviewCancel');
    const previewApplyBtn = getEl('bulkPreviewApply');

    // Store pending changes for preview/apply
    let pendingChanges = [];

    const fieldLabels = {
      desc2: 'Description 2',
      frequency: 'Frequency',
      lastDate: 'Last Scheduled Date',
      workGroup: 'Work Group',
      jobDescCode: 'Job Description',
      unitsRequired: 'Units Required',
      segFrom: 'Segment From',
      segTo: 'Segment To',
      protType: 'Protection Type',
      protMethod: 'Protection Method',
      allowMultiple: 'Allow Multiple'
    };

    const formatValue = (value, field) => {
      if (value === '' || value === null || value === undefined) return '(empty)';
      if (field === 'allowMultiple') return value ? 'Yes' : 'No';
      return String(value);
    };

    const showPreview = () => {
      if (!window.MST?.Editor?.applyBulkEdits) {
        alert('Bulk update is unavailable. Please refresh and try again.');
        return;
      }

      const rows = Array.from(editBody.querySelectorAll('tr[data-mst-id]'));
      const calendar = window.calendar;
      if (!calendar) return;

      pendingChanges = [];
      let totalChanges = 0;

      rows.forEach((row) => {
        const mstId = row.dataset.mstId;
        const inputs = row.querySelectorAll('input, select');
        const baseEvent = calendar.getEventById(`${mstId}_0`);
        const props = baseEvent?.extendedProps || {};

        const newValues = {
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

        const currentValues = {
          desc2: props.desc2 || '',
          frequency: String(props.frequency ?? ''),
          lastDate: Utils?.dateToInputYYYYMMDD ? Utils.dateToInputYYYYMMDD(baseEvent?.start) : '',
          workGroup: props.workGroup || '',
          jobDescCode: props.jobDescCode || '',
          unitsRequired: String(props.unitsRequired ?? ''),
          segFrom: String(props.segFrom ?? ''),
          segTo: String(props.segTo ?? ''),
          protType: props.protType || '',
          protMethod: props.protMethod || '',
          allowMultiple: (props.allowMultiple || '').toString().toUpperCase() === 'YES'
        };

        const changes = [];
        Object.keys(newValues).forEach(field => {
          const newVal = newValues[field];
          const curVal = currentValues[field];
          const normalizedNew = field === 'allowMultiple' ? newVal : String(newVal).trim();
          const normalizedCur = field === 'allowMultiple' ? curVal : String(curVal).trim();

          if (normalizedNew !== normalizedCur) {
            changes.push({
              field,
              oldValue: curVal,
              newValue: newVal
            });
            totalChanges++;
          }
        });

        if (changes.length > 0) {
          pendingChanges.push({
            mstId,
            equipmentNo: props.equipmentNo || '',
            taskNo: props.taskNo || '',
            desc1: props.desc1 || '',
            updates: newValues,
            changes
          });
        }
      });

      if (pendingChanges.length === 0) {
        alert('No changes detected. Please modify at least one field.');
        return;
      }

      // Render preview
      if (previewSummary) {
        previewSummary.textContent = `${totalChanges} change${totalChanges === 1 ? '' : 's'} across ${pendingChanges.length} MST${pendingChanges.length === 1 ? '' : 's'} will be applied.`;
      }

      if (previewBody) {
        previewBody.innerHTML = '';
        pendingChanges.forEach(item => {
          item.changes.forEach(change => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
              <td><strong>${item.equipmentNo}</strong> — ${item.taskNo}<br><small style="color:#64748b;">${item.desc1}</small></td>
              <td>${fieldLabels[change.field] || change.field}</td>
              <td><span class="preview-value-old">${formatValue(change.oldValue, change.field)}</span></td>
              <td><span class="preview-value-new">${formatValue(change.newValue, change.field)}</span></td>
            `;
            previewBody.appendChild(tr);
          });
        });
      }

      // Show preview modal
      if (previewOverlay) {
        previewOverlay.classList.add('active');
        previewOverlay.setAttribute('aria-hidden', 'false');
      }
    };

    const closePreview = () => {
      if (previewOverlay) {
        previewOverlay.classList.remove('active');
        previewOverlay.setAttribute('aria-hidden', 'true');
      }
    };

    const applyBulkUpdates = () => {
      let updated = 0;
      pendingChanges.forEach((item) => {
        const result = window.MST.Editor.applyBulkEdits(item.mstId, item.updates);
        if (result) updated += 1;
      });

      closePreview();
      closeEditor();
      alert(`Successfully updated ${updated} MST${updated === 1 ? '' : 's'}.`);
      openOverlay({ resetSelection: true, resetFilter: true });
    };

    // Preview modal event listeners
    closePreviewBtn?.addEventListener('click', closePreview);
    previewCancelBtn?.addEventListener('click', closePreview);
    previewApplyBtn?.addEventListener('click', applyBulkUpdates);
    previewOverlay?.addEventListener('click', (e) => {
      if (e.target === previewOverlay) closePreview();
    });

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
    applyBtn?.addEventListener('click', showPreview);
  }

  // ===================================
  // EQUIPMENT PICKER MODAL
  // ===================================
  function setupEquipmentPicker() {
    const overlay = getEl('equipPickerOverlay');
    const panel = getEl('equipPickerPanel');
    const closeBtn = getEl('closeEquipPickerBtn');
    const cancelBtn = getEl('equipPickerCancelBtn');
    const searchInput = getEl('equipPickerSearch');
    const clearBtn = getEl('equipPickerClearBtn');
    const tableBody = getEl('equipPickerBody');
    const statsEl = getEl('equipPickerStats');
    const openBtn = getEl('openEquipPickerBtn');

    if (!overlay || !panel || !tableBody) return;

    let allEquipment = []; // Cached array of { number, desc }
    let filteredEquipment = [];
    let currentSearchTerm = '';
    let debounceTimer = null;

    // Normalize equipment number for searching
    function normalizeEquip(value) {
      if (typeof Utils.normalizeEquip === 'function') return Utils.normalizeEquip(value);
      return (value || '').toString().toUpperCase().replace(/^0+/, '').trim();
    }

    // Normalize text for searching
    function normalizeText(value) {
      return (value || '').toString().toLowerCase().trim();
    }

    // Build the equipment list from window.equipmentDescriptions
    function buildEquipmentList() {
      allEquipment = [];
      const map = window.equipmentDescriptions;

      if (map && typeof map.forEach === 'function') {
        map.forEach((desc, equipNo) => {
          allEquipment.push({
            number: equipNo || '',
            desc: desc || ''
          });
        });
      }

      // Sort by equipment number
      allEquipment.sort((a, b) => {
        return normalizeEquip(a.number).localeCompare(normalizeEquip(b.number));
      });

      return allEquipment;
    }

    // Highlight matching text in a string
    function highlightMatch(text, term) {
      if (!term || !text) return escapeHtml(text || '');

      const normalizedText = text.toLowerCase();
      const normalizedTerm = term.toLowerCase();
      const index = normalizedText.indexOf(normalizedTerm);

      if (index === -1) return escapeHtml(text);

      const before = text.substring(0, index);
      const match = text.substring(index, index + term.length);
      const after = text.substring(index + term.length);

      return escapeHtml(before) +
             '<span class="equip-picker-highlight">' + escapeHtml(match) + '</span>' +
             escapeHtml(after);
    }

    // Escape HTML to prevent XSS
    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // Filter equipment based on search term
    function filterEquipment(term) {
      currentSearchTerm = term;
      const normalizedTerm = normalizeText(term);

      if (!normalizedTerm) {
        filteredEquipment = [...allEquipment];
      } else {
        filteredEquipment = allEquipment.filter(item => {
          const numMatch = normalizeText(item.number).includes(normalizedTerm);
          const descMatch = normalizeText(item.desc).includes(normalizedTerm);
          return numMatch || descMatch;
        });
      }

      return filteredEquipment;
    }

    // Render the equipment table
    function renderTable(equipment, searchTerm) {
      tableBody.innerHTML = '';

      if (equipment.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
          <td colspan="2" class="equip-picker-empty">
            <span class="equip-picker-empty-icon">&#128269;</span>
            ${searchTerm ? 'No equipment found matching "' + escapeHtml(searchTerm) + '"' : 'No equipment data available'}
          </td>
        `;
        tableBody.appendChild(emptyRow);
        return;
      }

      // Limit to prevent performance issues
      const maxDisplay = 200;
      const displayEquipment = equipment.slice(0, maxDisplay);

      displayEquipment.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${highlightMatch(item.number, searchTerm)}</td>
          <td>${highlightMatch(item.desc, searchTerm)}</td>
        `;
        tr.addEventListener('click', () => selectEquipment(item));
        tableBody.appendChild(tr);
      });

      // Update stats
      if (statsEl) {
        if (equipment.length > maxDisplay) {
          statsEl.textContent = `Showing ${maxDisplay} of ${equipment.length} equipment items. Type to narrow results.`;
        } else if (searchTerm) {
          statsEl.textContent = `Found ${equipment.length} equipment item${equipment.length === 1 ? '' : 's'}`;
        } else {
          statsEl.textContent = `${equipment.length} equipment items available. Type to search.`;
        }
      }
    }

    // Select equipment and populate the form
    function selectEquipment(item) {
      const equipInput = getEl('newEquipNo');
      const equipDesc = getEl('newEquipDesc');

      if (equipInput) {
        equipInput.value = item.number;
        // Trigger input event so any listeners update
        equipInput.dispatchEvent(new Event('input', { bubbles: true }));
        equipInput.dispatchEvent(new Event('blur', { bubbles: true }));
      }

      if (equipDesc) {
        equipDesc.textContent = item.desc;
      }

      closeOverlay();
    }

    // Open the equipment picker modal
    function openOverlay() {
      // Rebuild equipment list each time in case data changed
      buildEquipmentList();

      // Reset search
      if (searchInput) searchInput.value = '';
      currentSearchTerm = '';

      // Filter and render
      filterEquipment('');
      renderTable(filteredEquipment, '');

      overlay.classList.add('active');

      // Focus search input
      setTimeout(() => searchInput?.focus(), 50);
    }

    // Close the equipment picker modal
    function closeOverlay() {
      overlay.classList.remove('active');
      if (searchInput) searchInput.value = '';
      if (tableBody) tableBody.innerHTML = '';
      if (statsEl) statsEl.textContent = '';
    }

    // Handle search input with debounce
    function handleSearch() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const term = searchInput?.value || '';
        filterEquipment(term);
        renderTable(filteredEquipment, term);
      }, 150); // 150ms debounce for responsive feel
    }

    // Event listeners
    openBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openOverlay();
    });

    closeBtn?.addEventListener('click', closeOverlay);
    cancelBtn?.addEventListener('click', closeOverlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });

    searchInput?.addEventListener('input', handleSearch);

    // Clear search button
    clearBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      filterEquipment('');
      renderTable(filteredEquipment, '');
      searchInput?.focus();
    });

    // Handle Enter key to select first result
    searchInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && filteredEquipment.length > 0) {
        e.preventDefault();
        selectEquipment(filteredEquipment[0]);
      } else if (e.key === 'Escape') {
        closeOverlay();
      }
    });

    // Keyboard navigation in table
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeOverlay();
      }
    });

    // Expose functions globally for potential use elsewhere
    window.MST = window.MST || {};
    window.MST.Views = window.MST.Views || {};
    window.MST.Views.openEquipmentPicker = openOverlay;
    window.MST.Views.closeEquipmentPicker = closeOverlay;
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    setupGoto();
    setupFlaggedListView();
    setupBulkUpdate();
    setupEquipmentPicker();
  });
})();
