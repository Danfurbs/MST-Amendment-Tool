(function () {
  const MST = window.MST = window.MST || {};
  let activeId = null, pending = false;
  const R = MST.AdvisoryRules;
  const snapshotNote = 'This download recorded open work orders. The weekly snapshot may be out of date. Check the current position in Ellipse before changing dates or frequency.';
  function parseCount(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (String(value).trim() === '') return null;
    const count = Number(value);
    return Number.isSafeInteger(count) && count >= 0 ? count : null;
  }
  function workOrderCount(mstId, props = window.calendar?.getEventById(`${mstId}_0`)?.extendedProps || {}) {
    if (props.isNew) return null;
    const row = window.originalProps?.[mstId];
    return parseCount(row ? row['Open Work Order Count'] : props.openWorkOrderCount);
  }
  function workOrderLabel(count) {
    return count === null ? 'Work-order status unavailable' : count > 0
      ? `Open work orders: ${count} — at download.` : 'No open work orders recorded at download';
  }
  function refreshWorkOrders(mstId) {
    const count = mstId ? workOrderCount(mstId) : null;
    ['sidebar', 'editForm'].forEach(id => document.getElementById(id)?.classList?.toggle('has-open-work-orders', !!mstId && count > 0));
    const box = document.getElementById('mstWorkOrderStatus');
    if (!box) return;
    box.hidden = !mstId;
    box.replaceChildren();
    if (!mstId) return;
    const title = document.createElement('strong');
    title.textContent = workOrderLabel(count);
    box.appendChild(title);
    if (count > 0) {
      const note = document.createElement('p'); note.textContent = snapshotNote; box.appendChild(note);
    }
    const date = window.originalProps?.[mstId]?.['Download Date'];
    if (date) {
      const parsed = MST.Utils.parseDate?.(date);
      const displayDate = parsed && !Number.isNaN(parsed.getTime())
        ? parsed.toLocaleDateString('en-GB') : (typeof date === 'string' ? date : 'Unavailable');
      const label = document.createElement('p'); label.textContent = `Download date: ${displayDate}`; box.appendChild(label);
    }
  }
  function deactivationMessage(mstId) {
    const count = workOrderCount(mstId);
    if (!(count > 0)) return 'Deactivate this MST?';
    return `Deactivate MST ${mstId}?\n\nThe download recorded ${count} open work order(s). This weekly snapshot may be out of date; check the current status in Ellipse.\n\nDeactivating the MST does not close or cancel its work orders. Any open work order will remain active even against a deactivated MST.\n\nThe planner must arrange for the work order to be closed, or cancelled if the work is not complete.\n\nSelect OK to acknowledge this and deactivate the MST, or Cancel to review.`;
  }
  MST.WorkOrders = { parseCount, count: workOrderCount, label: workOrderLabel, refresh: refreshWorkOrders, deactivationMessage };
  const today = () => {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    return ['year', 'month', 'day'].map(key => parts.find(p => p.type === key).value).join('-');
  };
  const tolerance = code => {
    const item = window.MST_VARIABLES?.jobDescCodes?.find(x => x.code === String(code || '').trim().toUpperCase());
    return Number.isInteger(item?.tol) ? item.tol : null;
  };
  function values(mstId, draft = false) {
    const event = window.calendar?.getEventById(`${mstId}_0`);
    if (!event) return null;
    const props = event.extendedProps || {}, orig = window.originalProps?.[mstId] || {};
    const jobCode = draft ? window.jobDescCodeInput?.value : props.jobDescCode;
    return {
      lastScheduled: draft ? window.lastDateInput?.value : MST.Utils.dateToInputYYYYMMDD(event.start),
      lastPerformed: MST.Utils.normalizeDateInput(orig['Last Performed Date'] || ''),
      frequency: draft ? window.freqInput?.value : props.frequency,
      jobCode, tolerance: tolerance(jobCode),
      // The extract is normally indicator 1. Do not claim schedule validity for other modes.
      supported: !orig['Scheduling Indicator Code'] || String(orig['Scheduling Indicator Code']) === '1',
      deactivated: props.isDeactivated === true
    };
  }
  // Explicit snapshots let calendar drops bypass unrelated editor drafts.
  function check(mstId, proposal) {
    const current = values(mstId);
    if (!current) return null;
    const before = proposal ? { ...current, ...proposal.before } : current;
    const after = proposal ? { ...current, ...proposal.after } : values(mstId, true);
    before.tolerance = tolerance(before.jobCode);
    after.tolerance = tolerance(after.jobCode);
    if (!before || before.deactivated) return null;
    const result = R.compare(before, after, today());
    if (!after.supported) {
      result.after.backlog = null;
      result.worsened = result.worsened.filter(x => x !== 'backlog');
      result.needsConfirmation = result.worsened.length > 0;
    }
    result.mstId = mstId;
    result.openWorkOrderCount = workOrderCount(mstId);
    result.needsWorkOrderConfirmation = result.openWorkOrderCount > 0 &&
      (result.before.lsd !== result.after.lsd || Number(before.frequency) !== Number(after.frequency));
    result.needsConfirmation ||= result.needsWorkOrderConfirmation;
    return result;
  }
  function messages(result) {
    const a = result.after, lines = [];
    if (a.backlog > 0) lines.push(`Possible backlog: the calculated next scheduled date is ${R.formatDay(a.due)}, ${a.backlog} day(s) before today. Check whether an existing work order covers this work.`);
    if (a.nonCompliance > 0) lines.push(`If measured by compliance, this MST would be non-compliant on these dates: last performed ${R.formatDay(a.lpd)}, due ${R.formatDay(a.completionDue)}, plus ${a.tolerance} day(s) tolerance for ${a.jobCode}. The tolerance ended ${R.formatDay(a.limit)}, ${a.nonCompliance} day(s) ago.`);
    else if (a.late > 0 && a.limit !== null) lines.push(`If measured by compliance, completion is ${a.late} day(s) late, but still within the ${a.tolerance}-day tolerance for ${a.jobCode}. It becomes non-compliant after ${R.formatDay(a.limit)}.`);
    else if (a.late > 0) lines.push(`Completion is ${a.late} day(s) late. The Job Description Code tolerance is unknown; non-compliance cannot be assessed.`);
    if (a.lpd === null) lines.push('Last Performed Date is missing or invalid. Completion and compliance cannot be assessed.');
    if (!a.supported) lines.push('The scheduling indicator is not 1. Check the next schedule in Ellipse.');
    return lines;
  }
  function fill(container, result) {
    container.replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = result.needsConfirmation ? 'Check the impact before saving' : 'Scheduling and completion check';
    container.appendChild(heading);
    messages(result).forEach(message => { const p = document.createElement('p'); p.textContent = message; container.appendChild(p); });
    const note = document.createElement('p');
    note.textContent = 'Work-order counts come from the download snapshot; this tool cannot check live status. Last Scheduled Date is not proof of completion. A TV reference alone does not change this calculation.';
    container.appendChild(note);
  }
  function refresh(mstId = activeId) {
    activeId = mstId;
    refreshWorkOrders(mstId);
    const box = document.getElementById('mstSchedulingAdvisory');
    if (!box) return;
    const result = mstId ? check(mstId) : null;
    box.hidden = !result || messages(result).length === 0;
    if (!box.hidden) fill(box, result);
  }
  function confirmChange(mstId, proposal, batch) {
    if (pending) return Promise.resolve(false);
    const results = (batch || [{ mstId, proposal }]).map(item => check(item.mstId, item.proposal)).filter(Boolean);
    const result = results.find(item => item.needsConfirmation);
    if (!result) return Promise.resolve(true);
    const requiresAcknowledgement = results.some(item => item.needsWorkOrderConfirmation);
    pending = true;
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = 'mst-advisory-dialog';
      dialog.setAttribute('aria-labelledby', 'mstAdvisoryTitle');
      dialog.innerHTML = '<h2 id="mstAdvisoryTitle">Review this MST amendment</h2><div class="mst-advisory-copy"></div><p class="mst-advisory-caption" aria-live="polite"></p><div class="mst-advisory-timeline"></div><div class="mst-advisory-animation-controls"><button type="button" data-before>Before</button><button type="button" data-after>Proposed</button><button type="button" data-play>Replay animation</button></div><p>Check the linked work order and latest completion record in Ellipse. Do not move dates solely to remove a warning. This amendment is allowed.</p><div class="mst-advisory-actions"><button type="button" data-cancel>Review amendment</button><button type="button" data-proceed>Proceed with amendment</button></div>';
      fill(dialog.querySelector('.mst-advisory-copy'), result);
      const copy = dialog.querySelector('.mst-advisory-copy');
      if (batch) copy.replaceChildren();
      results.filter(item => item.needsConfirmation).forEach(item => {
        const section = document.createElement('section');
        section.className = item.needsWorkOrderConfirmation ? 'mst-work-order-review' : '';
        const heading = document.createElement('strong');
        heading.textContent = `${item.mstId}: ${workOrderLabel(item.openWorkOrderCount)}`;
        section.appendChild(heading);
        const change = document.createElement('p');
        change.textContent = `Last scheduled: ${R.formatDay(item.before.lsd)} → ${R.formatDay(item.after.lsd)}; next scheduled: ${R.formatDay(item.before.due)} → ${R.formatDay(item.after.due)}; frequency: ${item.before.frequency} → ${item.after.frequency} days.`;
        section.appendChild(change);
        if (item.needsWorkOrderConfirmation) {
          const note = document.createElement('p'); note.textContent = snapshotNote; section.appendChild(note);
        }
        if (batch) messages(item).forEach(text => { const p = document.createElement('p'); p.textContent = text; section.appendChild(p); });
        copy.appendChild(section);
      });
      let acknowledgement;
      const proceed = dialog.querySelector('[data-proceed]');
      if (requiresAcknowledgement) {
        const label = document.createElement('label'); label.className = 'mst-work-order-ack';
        acknowledgement = document.createElement('input'); acknowledgement.type = 'checkbox'; acknowledgement.checked = false;
        const text = document.createElement('span');
        text.textContent = 'I have reviewed the current work-order status in Ellipse, understand the risks of changing dates or frequency, and am satisfied these changes will not cause an issue.';
        label.appendChild(acknowledgement); label.appendChild(text); copy.appendChild(label);
        proceed.disabled = true;
        acknowledgement.addEventListener('change', () => { proceed.disabled = !acknowledgement.checked; });
        proceed.textContent = 'Confirm and apply changes';
        dialog.querySelector('[data-cancel]').textContent = 'Cancel and review';
      }
      if (batch) ['.mst-advisory-timeline', '.mst-advisory-caption', '.mst-advisory-animation-controls'].forEach(selector => { dialog.querySelector(selector).hidden = true; });
      const host = dialog.querySelector('.mst-advisory-timeline'), caption = dialog.querySelector('.mst-advisory-caption');
      let frame = null, timer = null, position = 0, closed = false;
      const priorFocus = document.activeElement;
      function finish(accepted) {
        if (closed) return;
        closed = true; cancelAnimationFrame(frame); clearTimeout(timer); observer?.disconnect();
        dialog.close(); dialog.remove(); pending = false; priorFocus?.focus(); resolve(accepted);
      }
      const allDates = [result.after.today, ...['lsd', 'lpd', 'due', 'completionDue', 'limit'].flatMap(k => [result.before[k], result.after[k]])].filter(Number.isFinite);
      const min = Math.min(...allDates) - 3, max = Math.max(...allDates) + 3;
      const ns = 'http://www.w3.org/2000/svg';
      function draw(t) {
        position = t;
        const w = Math.max(280, host.clientWidth), pad = 28, x = d => pad + (d - min) / (max - min) * (w - pad * 2);
        const svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', `0 0 ${w} 320`); svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'Before and proposed scheduling and completion dates; today is fixed.');
        function add(tag, attrs, text) { const el = document.createElementNS(ns, tag); Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k,v)); if (text !== undefined) el.textContent = text; svg.appendChild(el); }
        add('line', { x1:x(result.after.today),x2:x(result.after.today),y1:28,y2:294,class:'mst-timeline-today' });
        add('text', { x:x(result.after.today),y:18,'text-anchor':'middle' }, 'Today');
        const interpolate = key => result.before[key] === null || result.after[key] === null ? result.after[key] : result.before[key] + (result.after[key] - result.before[key]) * t;
        const target = t < .5 ? result.before : result.after;
        [['Scheduling', 'lsd', 'due', 70], ['Completion / compliance', 'lpd', 'completionDue', 210]].forEach(([name,base,due,y]) => {
          add('text',{x:4,y:y-22},name);
          add('line',{x1:pad,x2:w-pad,y1:y,y2:y,class:'mst-timeline-track'});
          [[base,'circle'],[due,'diamond'],...(base==='lpd'?[['limit','square']]:[])].forEach(([key,shape])=>{
            const d=interpolate(key); if(d===null)return; const cx=x(d);
            if(shape==='circle')add('circle',{cx,cy:y,r:5,class:'mst-timeline-base'});
            else if(shape==='diamond')add('path',{d:`M${cx} ${y-7} l7 7 -7 7 -7 -7 Z`,class:'mst-timeline-due'});
            else add('rect',{x:cx-4,y:y-8,width:8,height:16,class:'mst-timeline-limit'});
          });
          add('text',{x:4,y:y+27},`${base==='lsd'?'Last scheduled':'Last performed'}: ${R.formatDay(target[base])}`);
          add('text',{x:4,y:y+47},`Due: ${R.formatDay(target[due])}`);
          if(base==='lpd')add('text',{x:4,y:y+67},`Non-compliant after: ${R.formatDay(target.limit)}`);
        });
        host.replaceChildren(svg);
      }
      function show(t, animate) {
        clearTimeout(timer); cancelAnimationFrame(frame);
        caption.textContent = t ? `Proposed: ${result.after.frequency} days; tolerance ${result.after.tolerance ?? 'unknown'} days. Dates to the left of today have passed.` : `Before: ${result.before.frequency} days; tolerance ${result.before.tolerance ?? 'unknown'} days.`;
        if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { draw(t); return; }
        const from = position, start = performance.now();
        function tick(now) { const p = Math.min(1,(now-start)/1600), ease=p*p*(3-2*p); draw(from+(t-from)*ease); if(p<1)frame=requestAnimationFrame(tick); }
        frame=requestAnimationFrame(tick);
      }
      dialog.querySelector('[data-before]').onclick=()=>show(0,true);
      dialog.querySelector('[data-after]').onclick=()=>show(1,true);
      dialog.querySelector('[data-play]').onclick=()=>{show(0,false);timer=setTimeout(()=>show(1,true),700);};
      dialog.querySelector('[data-cancel]').onclick=()=>finish(false);
      dialog.querySelector('[data-proceed]').onclick=()=>{ if (!requiresAcknowledgement || acknowledgement.checked) finish(true); };
      dialog.addEventListener('cancel', event=>{event.preventDefault();finish(false);});
      dialog.addEventListener('close',()=>finish(false));
      document.body.appendChild(dialog);
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(()=>draw(position));
      observer?.observe(host);
      dialog.showModal(); dialog.querySelector('[data-cancel]').focus(); show(0,false);
      timer=setTimeout(()=>show(1,true),900);
    });
  }
  function confirmBulk(items) {
    return confirmChange(null, null, items.map(({ mstId, updates }) => ({ mstId, proposal: { after: {
      lastScheduled: MST.Utils.normalizeDateInput(updates.lastDate), frequency: updates.frequency, jobCode: updates.jobDescCode
    } } })));
  }
  MST.Advisory = { refresh, check, confirmChange, confirmBulk, tolerance, messages };
  document.addEventListener('DOMContentLoaded',()=>{
    ['lastDateInput','freqInput','jobDescCodeInput'].forEach(id=>{
      const el=document.getElementById(id);
      el?.addEventListener('input',()=>refresh()); el?.addEventListener('change',()=>refresh());
    });
  });
})();
