(function initResourceGraph() {
  window.MST = window.MST || {};
  window.MST.Resources = window.MST.Resources || {};

  // DOM elements
  const overlay = document.getElementById('resourceOverlay');
  const panel = document.getElementById('resourcePanel');
  const header = document.getElementById('resourceHeader');
  const openBtn = document.getElementById('openResourceBtn');
  const closeBtn = document.getElementById('closeResourceFloat');
  const prevWindowBtn = document.getElementById('prevWindowBtn');
  const nextWindowBtn = document.getElementById('nextWindowBtn');
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const todayBtn = document.getElementById('todayWindowBtn');
  const resourceRangeLabel = document.getElementById('resourceRangeLabel');
  const resourceCanvas = document.getElementById('plannedHoursChart');

  // Stats elements
  const statTotalHours = document.getElementById('statTotalHours');
  const statWeeklyAvg = document.getElementById('statWeeklyAvg');
  const statEventCount = document.getElementById('statEventCount');
  const statPeakWeek = document.getElementById('statPeakWeek');

  if (!overlay || !openBtn || !closeBtn || !resourceCanvas || !panel || !header) {
    return;
  }

  let resourceChart = null;
  let resourceWindowStart = startOfWeek(new Date()); // Monday of current week

  // Draggable panel functionality
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  const startDrag = (e) => {
    // Don't drag if clicking close button
    if (e.target === closeBtn || e.target.closest('.resource-close-btn')) return;

    isDragging = true;
    const rect = panel.getBoundingClientRect();
    dragOffsetX = e.clientX - rect.left;
    dragOffsetY = e.clientY - rect.top;
    header.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const doDrag = (e) => {
    if (!isDragging) return;

    const x = e.clientX - dragOffsetX;
    const y = e.clientY - dragOffsetY;

    // Keep panel within viewport bounds
    const maxX = window.innerWidth - panel.offsetWidth;
    const maxY = window.innerHeight - panel.offsetHeight;

    panel.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
    panel.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
    panel.style.right = 'auto';
  };

  const endDrag = () => {
    isDragging = false;
    header.style.cursor = 'grab';
  };

  header.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', endDrag);

  // Utility functions
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

  function formatWeekLabel(d) {
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }

  function isCurrentWeek(weekStartDate) {
    const currentWeekStart = startOfWeek(new Date());
    return weekStartDate.getTime() === currentWeekStart.getTime();
  }

  function isPastWeek(weekStartDate) {
    const currentWeekStart = startOfWeek(new Date());
    return weekStartDate.getTime() < currentWeekStart.getTime();
  }

  // Main data bucketing function
  function bucketResourceHours(windowStart, days = 42) {
    const windowEnd = MST.Utils.addDays(windowStart, days);
    const events = window.calendar ? window.calendar.getEvents() : [];
    const hoursByWeekKey = new Map(); // key: ISO date of Monday
    const eventsByWeekKey = new Map(); // track event count per week

    // Initialize 6 weeks
    for (let k = 0; k < 6; k++) {
      const wkStart = MST.Utils.addDays(startOfWeek(windowStart), k * 7);
      const key = wkStart.toISOString().slice(0, 10);
      hoursByWeekKey.set(key, 0);
      eventsByWeekKey.set(key, 0);
    }

    // Aggregate hours from events
    events.forEach((ev) => {
      const p = ev.extendedProps || {};
      const h = parseFloat(p.resourceHours || 0);
      if (!h || !ev.start) return;

      const d = startOfDay(ev.start);
      if (d < windowStart || d >= windowEnd) return;

      const wkStart = startOfWeek(d);
      const key = wkStart.toISOString().slice(0, 10);
      if (hoursByWeekKey.has(key)) {
        hoursByWeekKey.set(key, hoursByWeekKey.get(key) + h);
        eventsByWeekKey.set(key, eventsByWeekKey.get(key) + 1);
      }
    });

    const keys = [...hoursByWeekKey.keys()].sort();

    // Build labels for display
    const labels = keys.map((k) => {
      const d = new Date(`${k}T00:00:00`);
      return formatWeekLabel(d);
    });

    const data = keys.map((k) => hoursByWeekKey.get(k));
    const eventCounts = keys.map((k) => eventsByWeekKey.get(k));

    // Determine colors based on week status
    const currentWeekKey = startOfWeek(new Date()).toISOString().slice(0, 10);
    const backgroundColors = keys.map((k) => {
      if (k === currentWeekKey) return 'rgba(34, 197, 94, 0.85)'; // Current week - green
      if (k < currentWeekKey) return 'rgba(148, 163, 184, 0.6)'; // Past weeks - muted gray
      return 'rgba(59, 130, 246, 0.75)'; // Future weeks - blue
    });

    const borderColors = keys.map((k) => {
      if (k === currentWeekKey) return 'rgb(22, 163, 74)';
      if (k < currentWeekKey) return 'rgb(100, 116, 139)';
      return 'rgb(37, 99, 235)';
    });

    // Calculate statistics
    const totalHours = data.reduce((sum, v) => sum + v, 0);
    const totalEvents = eventCounts.reduce((sum, v) => sum + v, 0);
    const nonZeroWeeks = data.filter(v => v > 0).length;
    const weeklyAvg = nonZeroWeeks > 0 ? totalHours / nonZeroWeeks : 0;

    // Find peak week
    let peakWeekLabel = '-';
    let peakHours = 0;
    data.forEach((h, i) => {
      if (h > peakHours) {
        peakHours = h;
        peakWeekLabel = labels[i];
      }
    });

    return {
      labels,
      data,
      eventCounts,
      backgroundColors,
      borderColors,
      weekKeys: keys,
      rangeStart: windowStart,
      rangeEnd: MST.Utils.addDays(windowEnd, -1),
      stats: {
        totalHours,
        totalEvents,
        weeklyAvg,
        peakWeekLabel,
        peakHours
      }
    };
  }

  function updateStats(stats) {
    if (statTotalHours) {
      statTotalHours.textContent = stats.totalHours.toFixed(1);
    }
    if (statWeeklyAvg) {
      statWeeklyAvg.textContent = stats.weeklyAvg.toFixed(1);
    }
    if (statEventCount) {
      statEventCount.textContent = stats.totalEvents;
    }
    if (statPeakWeek) {
      const peakText = stats.peakHours > 0
        ? `${stats.peakWeekLabel} (${stats.peakHours.toFixed(1)}h)`
        : '-';
      statPeakWeek.textContent = peakText;
    }
  }

  function drawResourceChart() {
    const ctx = resourceCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      console.warn('Planned hours chart skipped: unable to obtain 2D canvas context.');
      return;
    }

    const result = bucketResourceHours(startOfWeek(resourceWindowStart), 42);
    const { labels, data, eventCounts, backgroundColors, borderColors, rangeStart, rangeEnd, stats } = result;

    // Update range label
    resourceRangeLabel.textContent = `${formatDMY(rangeStart)} → ${formatDMY(rangeEnd)}`;

    // Update statistics
    updateStats(stats);

    // If chart exists, update it
    if (resourceChart) {
      resourceChart.data.labels = labels;
      resourceChart.data.datasets[0].data = data;
      resourceChart.data.datasets[0].backgroundColor = backgroundColors;
      resourceChart.data.datasets[0].borderColor = borderColors;
      resourceChart.options.plugins.tooltip.callbacks.afterLabel = (ctx) => {
        const idx = ctx.dataIndex;
        const count = eventCounts[idx] || 0;
        return `${count} MST event${count !== 1 ? 's' : ''}`;
      };
      resourceChart.update();
      return;
    }

    // Create new chart
    resourceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Planned Hours',
            data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 300,
          easing: 'easeOutQuart'
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Hours',
              font: { size: 12, weight: '500' },
              color: '#64748b'
            },
            grid: {
              color: 'rgba(0, 0, 0, 0.06)'
            },
            ticks: {
              font: { size: 11 },
              color: '#64748b'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Week commencing',
              font: { size: 12, weight: '500' },
              color: '#64748b'
            },
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 0,
              minRotation: 0,
              font: { size: 11 },
              color: '#475569'
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { size: 13, weight: '600' },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              title: (items) => {
                if (!items.length) return '';
                const idx = items[0].dataIndex;
                const key = result.weekKeys[idx];
                const d = new Date(`${key}T00:00:00`);
                const d2 = MST.Utils.addDays(d, 6);
                return `Week: ${formatShort(d)} - ${formatShort(d2)}`;
              },
              label: (ctx) => `${ctx.parsed.y.toFixed(1)} hours planned`,
              afterLabel: (ctx) => {
                const idx = ctx.dataIndex;
                const count = eventCounts[idx] || 0;
                return `${count} MST event${count !== 1 ? 's' : ''}`;
              }
            }
          }
        },
        layout: {
          padding: {
            top: 10,
            bottom: 6
          }
        }
      }
    });
  }

  // Expose refresh function
  window.MST.Resources.refreshChart = () => {
    if (overlay.classList.contains('active')) {
      drawResourceChart();
    }
  };

  // Event handlers
  function openModal() {
    overlay.classList.add('active');
    drawResourceChart();
  }

  function closeModal() {
    overlay.classList.remove('active');
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);

  // Navigation: Previous 6 weeks
  if (prevWindowBtn) {
    prevWindowBtn.addEventListener('click', () => {
      resourceWindowStart = MST.Utils.addDays(resourceWindowStart, -42);
      drawResourceChart();
    });
  }

  // Navigation: Next 6 weeks
  if (nextWindowBtn) {
    nextWindowBtn.addEventListener('click', () => {
      resourceWindowStart = MST.Utils.addDays(resourceWindowStart, 42);
      drawResourceChart();
    });
  }

  // Navigation: Previous week
  if (prevWeekBtn) {
    prevWeekBtn.addEventListener('click', () => {
      resourceWindowStart = MST.Utils.addDays(resourceWindowStart, -7);
      drawResourceChart();
    });
  }

  // Navigation: Next week
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      resourceWindowStart = MST.Utils.addDays(resourceWindowStart, 7);
      drawResourceChart();
    });
  }

  // Navigation: Today
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      resourceWindowStart = startOfWeek(new Date());
      drawResourceChart();
    });
  }
})();
