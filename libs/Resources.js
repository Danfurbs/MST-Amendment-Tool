(function initResourceGraph() {
  window.MST = window.MST || {};
  window.MST.Resources = window.MST.Resources || {};

  const panel = document.getElementById('resourceFloatPanel');
  const openBtn = document.getElementById('openResourceBtn');
  const closeBtn = document.getElementById('closeResourceFloat');
  const prevWindowBtn = document.getElementById('prevWindowBtn');
  const nextWindowBtn = document.getElementById('nextWindowBtn');
  const resourceRangeLabel = document.getElementById('resourceRangeLabel');
  const resourceCanvas = document.getElementById('plannedHoursChart');
  const dragArea = document.getElementById('resourceFloatHeader');

  if (!panel || !openBtn || !closeBtn || !resourceCanvas) {
    return;
  }

  let resourceChart = null;
  let resourceWindowStart = startOfWeek(new Date()); // Monday by default
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  function startOfDay(d) {
    const x = new Date(d.getTime());
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function startOfWeek(d) {
    const x = startOfDay(d);
    const day = x.getDay(); // 0=Sun..6=Sat
    const diff = (day === 0 ? -6 : 1) - day; // make Monday start
    x.setDate(x.getDate() + diff);
    return x;
  }

  function formatDMY(d) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }

  function formatShort(d) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function bucketResourceHours(windowStart, days = 42) {
    const windowEnd = MST.Utils.addDays(windowStart, days);
    const events = window.calendar.getEvents();
    const hoursByWeekKey = new Map(); // key: ISO date of Monday

    for (let k = 0; k < 6; k++) {
      const wkStart = MST.Utils.addDays(startOfWeek(windowStart), k * 7);
      hoursByWeekKey.set(wkStart.toISOString().slice(0, 10), 0);
    }

    events.forEach((ev) => {
      const p = ev.extendedProps || {};
      const h = parseFloat(p.resourceHours || 0);
      if (!h || !ev.start) return;

      const d = startOfDay(ev.start);
      if (d < windowStart || d >= windowEnd) return;

      const wkStart = startOfWeek(d);
      const key = wkStart.toISOString().slice(0, 10);
      if (!hoursByWeekKey.has(key)) hoursByWeekKey.set(key, 0);
      hoursByWeekKey.set(key, hoursByWeekKey.get(key) + h);
    });

    const keys = [...hoursByWeekKey.keys()].sort();
    const labels = keys.map((k) => {
      const d = new Date(`${k}T00:00:00`);
      const d2 = MST.Utils.addDays(d, 6);
      const startLabel = formatShort(d);
      const endLabel = formatShort(d2);
      return [`w/c ${startLabel}`, `to ${endLabel}`];
    });
    const data = keys.map((k) => hoursByWeekKey.get(k));

    return { labels, data, rangeStart: windowStart, rangeEnd: MST.Utils.addDays(windowEnd, -1) };
  }

  function drawResourceChart() {
    const ctx = resourceCanvas.getContext('2d');
    const { labels, data, rangeStart, rangeEnd } = bucketResourceHours(startOfWeek(resourceWindowStart), 42);

    resourceRangeLabel.textContent = `${formatDMY(rangeStart)} → ${formatDMY(rangeEnd)}`;

    if (resourceChart) {
      resourceChart.data.labels = labels;
      resourceChart.data.datasets[0].data = data;
      resourceChart.update();
      return;
    }

    resourceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Planned Hours',
            data,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Hours' } },
          x: {
            title: { display: true, text: 'Week' },
            ticks: { maxRotation: 0, minRotation: 0, autoSkip: false },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y.toFixed(1)} h`,
            },
          },
        },
      },
    });
  }

  window.MST.Resources.refreshChart = drawResourceChart;

  openBtn.addEventListener('click', () => {
    panel.style.display = 'flex';
    drawResourceChart();
  });

  closeBtn.addEventListener('click', () => {
    panel.style.display = 'none';
  });

  if (prevWindowBtn) {
    prevWindowBtn.addEventListener('click', () => {
      resourceWindowStart = MST.Utils.addDays(resourceWindowStart, -42);
      drawResourceChart();
    });
  }

  if (nextWindowBtn) {
    nextWindowBtn.addEventListener('click', () => {
      resourceWindowStart = MST.Utils.addDays(resourceWindowStart, 42);
      drawResourceChart();
    });
  }

  if (dragArea) {
    dragArea.addEventListener('mousedown', (e) => {
      dragging = true;
      offsetX = e.clientX - panel.offsetLeft;
      offsetY = e.clientY - panel.offsetTop;
      dragArea.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      panel.style.left = `${e.clientX - offsetX}px`;
      panel.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
      dragging = false;
      dragArea.style.cursor = 'grab';
    });
  }
})();
