/* ===========================================================
   FootprintUpload.js
   Handles:
   - Access Footprint file upload and parsing
   - Frequency text conversion (e.g., "Weekly" -> 7 days)
   - Shift code conversion (e.g., "MWN" -> midweek nights)
   - Background event rendering on calendar
   =========================================================== */

document.addEventListener("DOMContentLoaded", function () {

  window.MST = window.MST || {};
  window.MST.Footprint = window.MST.Footprint || {};

  const footprintInput = document.getElementById("footprintInput");
  const footprintLabel = document.querySelector('label[for="footprintInput"]');
  const footprintLabelText = document.querySelector(".footprint-upload-label-text");

  // Store loaded footprint data
  window.footprintData = [];
  window.footprintEvents = [];

  // Color palette for different Short Codes (Library Possession)
  const shortCodeColors = new Map();
  const colorPalette = [
    "#3b82f6", // blue
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#f97316", // orange
    "#14b8a6", // teal
    "#84cc16", // lime
    "#f43f5e", // rose
    "#06b6d4", // cyan
    "#a855f7", // purple
    "#22c55e", // green
    "#eab308", // yellow
    "#6366f1", // indigo
  ];
  let colorIndex = 0;

  /**
   * Get or assign a color for a given Short Code
   */
  function getColorForShortCode(shortCode) {
    if (!shortCode) return colorPalette[0];

    if (!shortCodeColors.has(shortCode)) {
      shortCodeColors.set(shortCode, colorPalette[colorIndex % colorPalette.length]);
      colorIndex++;
    }
    return shortCodeColors.get(shortCode);
  }

  /**
   * Convert frequency text to number of days
   * Examples: "Weekly" -> 7, "Fortnightly" -> 14, "Monthly" -> 28
   */
  function parseFrequencyText(freqText) {
    if (!freqText) return 7; // default to weekly

    const text = freqText.toString().toLowerCase().trim();

    // Direct mappings
    const frequencyMap = {
      "daily": 1,
      "weekly": 7,
      "fortnightly": 14,
      "bi-weekly": 14,
      "biweekly": 14,
      "monthly": 28,
      "4 weekly": 28,
      "4-weekly": 28,
      "four weekly": 28,
      "every 4 weeks": 28,
      "6 weekly": 42,
      "6-weekly": 42,
      "six weekly": 42,
      "8 weekly": 56,
      "8-weekly": 56,
      "quarterly": 91,
      "annually": 365,
      "yearly": 365,
    };

    if (frequencyMap[text]) {
      return frequencyMap[text];
    }

    // Try to extract number of weeks
    const weekMatch = text.match(/(\d+)\s*week/i);
    if (weekMatch) {
      return parseInt(weekMatch[1], 10) * 7;
    }

    // Try to extract number of days
    const dayMatch = text.match(/(\d+)\s*day/i);
    if (dayMatch) {
      return parseInt(dayMatch[1], 10);
    }

    return 7; // default
  }

  /**
   * Parse shift day codes to determine which days of the week
   *
   * Common patterns from "No of Shifts" column:
   * - "Sun-Sun" = Sunday to Sunday (all week)
   * - "MWN" = Midweek Nights (Monday, Tuesday, Wednesday, Thursday nights)
   * - "Sat-Sun" = Saturday and Sunday
   * - "Fri-Sat" = Friday and Saturday
   * - "Mon-Fri" = Monday to Friday (weekdays)
   * - Individual days: "Mon", "Tue", "Wed", etc.
   *
   * Returns array of day indices (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   */
  function parseShiftDays(shiftCode) {
    if (!shiftCode) return [0, 1, 2, 3, 4, 5, 6]; // all days by default

    const code = shiftCode.toString().toUpperCase().trim();

    // Special codes
    const specialCodes = {
      "MWN": [1, 2, 3, 4],           // Midweek Nights: Mon, Tue, Wed, Thu
      "MID-WEEK": [1, 2, 3, 4],
      "MIDWEEK": [1, 2, 3, 4],
      "WEEKDAY": [1, 2, 3, 4, 5],
      "WEEKDAYS": [1, 2, 3, 4, 5],
      "WEEKEND": [0, 6],              // Sat, Sun
      "WEEKENDS": [0, 6],
      "WEN": [0, 6],                  // Weekend Nights
      "FRI-SAT": [5, 6],
      "SAT-SUN": [0, 6],
      "FSON": [5, 6, 0],              // Friday, Saturday, Sunday nights
      "FSSO": [5, 6, 0],
    };

    if (specialCodes[code]) {
      return specialCodes[code];
    }

    // Day name mapping
    const dayNames = {
      "SUN": 0, "SUNDAY": 0,
      "MON": 1, "MONDAY": 1,
      "TUE": 2, "TUESDAY": 2,
      "WED": 3, "WEDNESDAY": 3,
      "THU": 4, "THURSDAY": 4,
      "FRI": 5, "FRIDAY": 5,
      "SAT": 6, "SATURDAY": 6,
    };

    // Check for range patterns like "Sun-Sun", "Mon-Fri"
    const rangeMatch = code.match(/^(\w+)\s*[-–]\s*(\w+)$/);
    if (rangeMatch) {
      const startDay = dayNames[rangeMatch[1]];
      const endDay = dayNames[rangeMatch[2]];

      if (startDay !== undefined && endDay !== undefined) {
        const days = [];
        if (startDay === endDay) {
          // Same day means all week (e.g., Sun-Sun)
          return [0, 1, 2, 3, 4, 5, 6];
        }

        let current = startDay;
        while (true) {
          days.push(current);
          if (current === endDay) break;
          current = (current + 1) % 7;
        }
        return days;
      }
    }

    // Check for individual day
    if (dayNames[code] !== undefined) {
      return [dayNames[code]];
    }

    // Check for comma-separated days
    const parts = code.split(/[,\s&]+/);
    const days = [];
    parts.forEach(part => {
      const trimmed = part.trim();
      if (dayNames[trimmed] !== undefined) {
        days.push(dayNames[trimmed]);
      }
    });

    if (days.length > 0) {
      return days;
    }

    // Default: all days
    return [0, 1, 2, 3, 4, 5, 6];
  }

  /**
   * Parse shift times to determine start and duration
   * Format: "0035-0730" means 00:35 to 07:30
   */
  function parseShiftTimes(shiftTimeStr) {
    if (!shiftTimeStr) return { startHour: 0, duration: 8 };

    const str = shiftTimeStr.toString().trim();
    const match = str.match(/(\d{2})(\d{2})\s*[-–]\s*(\d{2})(\d{2})/);

    if (match) {
      const startHour = parseInt(match[1], 10);
      const startMin = parseInt(match[2], 10);
      const endHour = parseInt(match[3], 10);
      const endMin = parseInt(match[4], 10);

      let duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);
      if (duration < 0) duration += 24 * 60; // overnight shift

      return {
        startHour: startHour + startMin / 60,
        duration: duration / 60
      };
    }

    return { startHour: 0, duration: 8 };
  }

  /**
   * Get start of the week (Sunday) for a given date
   */
  function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Generate footprint events for a given row
   * Creates background events for the calendar
   */
  function generateFootprintEvents(row, weeksToGenerate = 52) {
    const shortCode = safeTrim(row["Short Code"]);
    const frequency = safeTrim(row["Frequency"]);
    const shiftDaysCode = safeTrim(row["No of Shifts"]);
    const shiftTimes = safeTrim(row["Shift times"]);
    const possessionNumber = safeTrim(row["Library Possession Number"]);
    const workstation = safeTrim(row["Workstation"]);
    const locations = safeTrim(row["Locations from & to"]);
    const linesBlocked = safeTrim(row["Lines Blocked"]);
    const possLimits = safeTrim(row["Poss'n Limits"]);

    const frequencyDays = parseFrequencyText(frequency);
    const shiftDays = parseShiftDays(shiftDaysCode);
    const { startHour } = parseShiftTimes(shiftTimes);
    const color = getColorForShortCode(shortCode);

    const events = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from 4 weeks ago
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 28);

    // Calculate total days to generate
    const totalDays = weeksToGenerate * 7 + 28;

    // Track which week-day combinations we've added events for
    // to handle frequency properly
    let dayCounter = 0;

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + dayOffset);

      const dayOfWeek = currentDate.getDay();

      // Check if this day of week is in our shift days
      if (!shiftDays.includes(dayOfWeek)) {
        continue;
      }

      // Check frequency - only show every N days for the applicable days
      if (dayCounter % frequencyDays !== 0) {
        dayCounter++;
        continue;
      }
      dayCounter++;

      // Create the event
      const eventId = `footprint_${shortCode}_${currentDate.toISOString().slice(0, 10)}_${dayOfWeek}`;

      events.push({
        id: eventId,
        start: currentDate,
        display: "background",
        backgroundColor: color,
        classNames: ["footprint-event"],
        extendedProps: {
          isFootprint: true,
          shortCode,
          possessionNumber,
          workstation,
          locations,
          linesBlocked,
          possLimits,
          frequency,
          shiftDays: shiftDaysCode,
          shiftTimes,
        }
      });
    }

    return events;
  }

  /**
   * Safely trim any value to string
   */
  function safeTrim(value) {
    if (value == null) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value).trim();
    }
    if (value instanceof Date) return value.toISOString().trim();
    return "";
  }

  /**
   * Clear all existing footprint events from calendar
   */
  function clearFootprintEvents() {
    if (!window.calendar) return;

    window.calendar.getEvents().forEach(ev => {
      if (ev.extendedProps?.isFootprint) {
        ev.remove();
      }
    });

    window.footprintEvents = [];
  }

  /**
   * Render footprint events on the calendar
   */
  function renderFootprintEvents(rows) {
    if (!window.calendar) {
      console.error("Calendar not initialized");
      return;
    }

    clearFootprintEvents();

    const allEvents = [];

    rows.forEach(row => {
      const events = generateFootprintEvents(row);
      allEvents.push(...events);
    });

    // Add events in batch for performance
    window.calendar.batchRendering(() => {
      allEvents.forEach(eventData => {
        try {
          const ev = window.calendar.addEvent(eventData);
          window.footprintEvents.push(ev);
        } catch (err) {
          console.error("Failed to add footprint event:", err);
        }
      });
    });

    console.log(`Added ${allEvents.length} footprint events to calendar`);
  }

  /**
   * Update the footprint upload label to show loaded status
   * (No longer locks - allows re-upload)
   */
  function updateFootprintLabel(loaded) {
    if (footprintLabelText) {
      footprintLabelText.textContent = loaded
        ? "📋 Re-upload footprint"
        : "📋 Choose footprint file";
    }

    if (footprintLabel) {
      footprintLabel.title = loaded ? "Click to upload a different footprint file" : "";
    }
  }

  /**
   * Parse and load the footprint workbook
   */
  function parseAndLoadFootprintWorkbook(rawData, workbookType) {
    try {
      const workbook = XLSX.read(rawData, { type: workbookType });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!sheet) {
        throw new Error("No sheets found in the uploaded footprint file.");
      }

      const json = XLSX.utils.sheet_to_json(sheet, { blankrows: false });

      if (!json.length) {
        throw new Error("No data found in the footprint file.");
      }

      // Store the data
      window.footprintData = json;

      // Render on calendar
      renderFootprintEvents(json);

      // Update the label to show loaded status (but don't lock)
      updateFootprintLabel(true);

      // Show confirmation
      const shortCodes = [...new Set(json.map(r => safeTrim(r["Short Code"])))].filter(Boolean);
      alert(`Loaded ${json.length} footprint entries with ${shortCodes.length} unique possession codes.`);

    } catch (err) {
      console.error("Footprint upload error:", err);
      alert(err.message || "Failed to read footprint file. Please check the format.");
    }
  }

  /**
   * Handle file input change
   */
  if (footprintInput) {
    footprintInput.addEventListener("change", function(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = function(ev) {
        try {
          const data = ev.target.result;
          parseAndLoadFootprintWorkbook(data, "binary");
        } catch (err) {
          console.error(err);
          alert(err.message || "Failed to read footprint file.");
        }
      };

      reader.readAsBinaryString(file);

      // Reset the input so the same file can be re-selected
      this.value = "";
    });
  }

  /**
   * Toggle footprint visibility
   */
  window.MST.Footprint.toggleVisibility = function(visible) {
    if (!window.calendar) return;

    window.calendar.getEvents().forEach(ev => {
      if (ev.extendedProps?.isFootprint) {
        if (visible) {
          ev.setProp("display", "background");
        } else {
          ev.setProp("display", "none");
        }
      }
    });
  };

  /**
   * Get loaded footprint data
   */
  window.MST.Footprint.getData = function() {
    return window.footprintData || [];
  };

  /**
   * Get color mapping for legend
   */
  window.MST.Footprint.getColorMapping = function() {
    return Object.fromEntries(shortCodeColors);
  };

  /**
   * Refresh footprint events (e.g., after calendar date range change)
   */
  window.MST.Footprint.refresh = function() {
    if (window.footprintData && window.footprintData.length > 0) {
      renderFootprintEvents(window.footprintData);
    }
  };

});
