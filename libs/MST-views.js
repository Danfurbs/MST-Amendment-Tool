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
          events.forEach((e) => { if (e.display !== 'auto') e.setProp('display', 'auto'); });
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
          const desired = show ? 'auto' : 'none';
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

      calendar.batchRendering(() => {
        calendar.getEvents().forEach((e) => {
          if (e.display !== 'auto') e.setProp('display', 'auto');
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

  document.addEventListener('DOMContentLoaded', () => {
    setupFilters();
    setupGoto();
  });
})();
