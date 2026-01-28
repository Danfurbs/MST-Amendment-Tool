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
  // Using semi-transparent pastel colors for subtle background
  const shortCodeColors = new Map();
  const colorPalette = [
    "rgba(147, 197, 253, 0.4)", // light blue
    "rgba(196, 181, 253, 0.4)", // light violet
    "rgba(249, 168, 212, 0.4)", // light pink
    "rgba(253, 186, 116, 0.4)", // light orange
    "rgba(94, 234, 212, 0.4)",  // light teal
    "rgba(190, 242, 100, 0.4)", // light lime
    "rgba(253, 164, 175, 0.4)", // light rose
    "rgba(103, 232, 249, 0.4)", // light cyan
    "rgba(216, 180, 254, 0.4)", // light purple
    "rgba(134, 239, 172, 0.4)", // light green
    "rgba(253, 224, 71, 0.4)",  // light yellow
    "rgba(165, 180, 252, 0.4)", // light indigo
  ];
  let colorIndex = 0;

  // Store possession details for legend
  const possessionDetails = new Map();
  // Track which possessions are visible
  const possessionVisibility = new Map();

  /**
   * Get or assign a color for a given Short Code
   */
  function getColorForShortCode(shortCode) {
    if (!shortCode) return colorPalette[0];

    if (!shortCodeColors.has(shortCode)) {
      shortCodeColors.set(shortCode, colorPalette[colorIndex % colorPalette.length]);
      possessionVisibility.set(shortCode, true); // visible by default
      colorIndex++;
    }
    return shortCodeColors.get(shortCode);
  }

  /**
   * Store possession details for legend display
   */
  function storePossessionDetails(shortCode, details) {
    if (!shortCode) return;
    // Only store if we don't have it yet, or update with more complete info
    if (!possessionDetails.has(shortCode) || !possessionDetails.get(shortCode).description) {
      possessionDetails.set(shortCode, details);
    }
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
   * Normalize a column name for matching (remove spaces, lowercase)
   */
  function normalizeColName(name) {
    return (name || "").toString().toLowerCase().replace(/[\s_\-]+/g, "").trim();
  }

  /**
   * Get a column value with fallback names (flexible matching)
   */
  function getColumnValue(row, ...possibleNames) {
    const rowKeys = Object.keys(row);

    for (const name of possibleNames) {
      // Try exact match first
      if (row[name] !== undefined) return safeTrim(row[name]);

      // Try case-insensitive match
      const lowerName = name.toLowerCase();
      for (const key of rowKeys) {
        if (key.toLowerCase() === lowerName) {
          return safeTrim(row[key]);
        }
      }

      // Try normalized match (ignores spaces, dashes, underscores)
      const normalizedName = normalizeColName(name);
      for (const key of rowKeys) {
        if (normalizeColName(key) === normalizedName) {
          return safeTrim(row[key]);
        }
      }

      // Try partial/contains match for longer names
      if (name.length > 3) {
        for (const key of rowKeys) {
          const normalizedKey = normalizeColName(key);
          if (normalizedKey.includes(normalizedName) || normalizedName.includes(normalizedKey)) {
            return safeTrim(row[key]);
          }
        }
      }
    }
    return "";
  }

  /**
   * Generate footprint events for a given row
   * Creates background events for the calendar
   */
  function generateFootprintEvents(row, weeksToGenerate = 52) {
    // Support multiple column name formats
    const shortCode = getColumnValue(row, "Code", "Short Code", "ShortCode", "Possession Code");
    const frequency = getColumnValue(row, "Frequency", "Freq");
    const shiftDaysCode = getColumnValue(row, "Days", "No of Shifts", "Shifts", "Day");
    const startDateStr = getColumnValue(row, "Start Date", "StartDate", "Start", "From Date", "From");
    const endDateStr = getColumnValue(row, "End Date", "EndDate", "End", "To Date", "To", "Expires", "Expiry");
    const description = getColumnValue(row, "Description", "Desc", "Notes", "Info");
    const shiftTimes = getColumnValue(row, "Shift times", "Times", "Time");
    const possessionNumber = getColumnValue(row, "Library Possession Number", "Possession Number", "Ref");
    const workstation = getColumnValue(row, "Workstation", "Location");
    const locations = getColumnValue(row, "Locations from & to", "Locations", "Route");
    const linesBlocked = getColumnValue(row, "Lines Blocked", "Lines");
    const possLimits = getColumnValue(row, "Poss'n Limits", "Limits");

    if (!shortCode) {
      console.warn("Skipping row - no short code found:", row);
      return [];
    }

    // Store details for legend
    storePossessionDetails(shortCode, {
      description: description || locations || workstation || "",
      days: shiftDaysCode || "Sun-Sun",
      frequency: frequency || "Weekly",
      possessionNumber,
      workstation,
      locations,
      endDate: endDateStr || "",
    });

    // Check if this possession is visible
    if (possessionVisibility.has(shortCode) && !possessionVisibility.get(shortCode)) {
      return []; // Hidden, don't generate events
    }

    const frequencyDays = parseFrequencyText(frequency);
    const frequencyWeeks = Math.max(1, Math.round(frequencyDays / 7));
    const shiftDays = parseShiftDays(shiftDaysCode);
    const color = getColorForShortCode(shortCode);

    const events = [];
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Parse start date if provided, otherwise use 4 weeks ago
    let startDate;
    if (startDateStr) {
      startDate = parseStartDate(startDateStr);
      if (!startDate) {
        console.warn(`Invalid start date "${startDateStr}" for ${shortCode}, using default`);
        startDate = getDefaultStartDate(today);
      }
    } else {
      startDate = getDefaultStartDate(today);
    }

    // Parse optional end date
    let endDate = null;
    if (endDateStr) {
      endDate = parseStartDate(endDateStr);
      if (endDate) {
        console.log(`Footprint ${shortCode} has end date: ${endDate.toISOString().slice(0, 10)}`);
      }
    }

    // Calculate weeks to generate from start date
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksFromStart = Math.ceil((today - startDate) / msPerWeek);
    const totalWeeks = Math.max(weeksToGenerate, weeksFromStart + weeksToGenerate);

    // Build event title/description for calendar display
    const eventTitle = description || locations || workstation || shortCode;

    // Generate events week by week from the start date
    for (let weekOffset = 0; weekOffset < totalWeeks; weekOffset++) {
      // Apply frequency - only show every N weeks
      if (weekOffset % frequencyWeeks !== 0) {
        continue;
      }

      // For each applicable day in this week
      shiftDays.forEach(dayOfWeek => {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (weekOffset * 7) + dayOfWeek);
        currentDate.setHours(12, 0, 0, 0);

        // Skip dates too far in the past (more than 8 weeks ago)
        const weeksAgo = (today - currentDate) / msPerWeek;
        if (weeksAgo > 8) return;

        // Skip dates after end date (if specified)
        if (endDate && currentDate > endDate) {
          return;
        }

        // Create the event - use date string for ID to avoid duplicates
        const dateStr = currentDate.toISOString().slice(0, 10);
        const eventId = `fp_${shortCode}_${dateStr}`;

        events.push({
          id: eventId,
          title: `${shortCode}: ${eventTitle}`,
          start: dateStr,
          allDay: true,
          display: "auto",
          backgroundColor: color,
          borderColor: color,
          textColor: "#1e293b",
          classNames: ["footprint-event"],
          extendedProps: {
            isFootprint: true,
            shortCode,
            description,
            possessionNumber,
            workstation,
            locations,
            linesBlocked,
            possLimits,
            frequency,
            shiftDays: shiftDaysCode,
            shiftTimes,
            startDate: startDateStr,
            endDate: endDateStr,
          }
        });
      });
    }

    return events;
  }

  /**
   * Parse a start date from various formats
   */
  function parseStartDate(dateStr) {
    if (!dateStr) return null;

    // Handle Excel serial date numbers (as number or numeric string)
    const numValue = typeof dateStr === "number" ? dateStr : parseFloat(dateStr);
    if (!isNaN(numValue) && numValue > 40000 && numValue < 60000) {
      // Looks like an Excel serial date (40000 = ~2009, 60000 = ~2064)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + numValue * 24 * 60 * 60 * 1000);
      date.setHours(12, 0, 0, 0);
      console.log(`Parsed Excel serial ${numValue} as ${date.toISOString().slice(0, 10)}`);
      return isNaN(date.getTime()) ? null : date;
    }

    const str = dateStr.toString().trim();

    // Try ISO format: 2026-01-27
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const [y, m, d] = str.split("-").map(Number);
      const date = new Date(y, m - 1, d, 12, 0, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try UK format: 27/01/2026 or 27-01-2026
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const date = new Date(+parts[2], +parts[1] - 1, +parts[0], 12, 0, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try short UK format: 27/01/26
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2}$/.test(str)) {
      const parts = str.split(/[\/\-]/);
      const year = +parts[2] + 2000;
      const date = new Date(year, +parts[1] - 1, +parts[0], 12, 0, 0, 0);
      return isNaN(date.getTime()) ? null : date;
    }

    // Try native Date parsing as fallback (but validate the year)
    const date = new Date(str);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      // Only accept reasonable years (2020-2050)
      if (year >= 2020 && year <= 2050) {
        date.setHours(12, 0, 0, 0);
        return date;
      }
    }

    console.warn(`Could not parse date: "${dateStr}"`);
    return null;
  }

  /**
   * Get default start date (aligned to start of week, 4 weeks ago)
   */
  function getDefaultStartDate(today) {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setDate(startOfWeek.getDate() - 28);
    startOfWeek.setHours(12, 0, 0, 0);
    return startOfWeek;
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

    // Log sample of events for debugging
    if (allEvents.length > 0) {
      console.log("Sample footprint event:", allEvents[0]);
      const today = new Date().toISOString().slice(0, 10);
      const todayEvents = allEvents.filter(e => e.start === today);
      console.log(`Events for today (${today}):`, todayEvents.length);
    }

    // Add events in batch for performance
    window.calendar.batchRendering(() => {
      allEvents.forEach(eventData => {
        try {
          const ev = window.calendar.addEvent(eventData);
          if (ev) {
            window.footprintEvents.push(ev);
          }
        } catch (err) {
          console.error("Failed to add footprint event:", err, eventData);
        }
      });
    });

    console.log(`Added ${allEvents.length} footprint events to calendar`);
    console.log(`Calendar now has ${window.calendar.getEvents().length} total events`);
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

      // Debug: log column names found
      if (json[0]) {
        console.log("Footprint columns found:", Object.keys(json[0]));
        console.log("First row data:", json[0]);
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
          ev.setProp("display", "auto");
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
   * Get color mapping for legend (simple version)
   */
  window.MST.Footprint.getColorMapping = function() {
    return Object.fromEntries(shortCodeColors);
  };

  /**
   * Get detailed possession info for legend
   */
  window.MST.Footprint.getPossessionDetails = function() {
    const result = [];
    shortCodeColors.forEach((color, code) => {
      const details = possessionDetails.get(code) || {};
      result.push({
        code,
        color,
        visible: possessionVisibility.get(code) !== false,
        description: details.description || "",
        days: details.days || "",
        frequency: details.frequency || "",
        possessionNumber: details.possessionNumber || "",
        workstation: details.workstation || "",
        locations: details.locations || "",
        endDate: details.endDate || "",
      });
    });
    return result;
  };

  /**
   * Filter footprints by text search (code, description, location)
   */
  window.MST.Footprint.filterByText = function(searchText) {
    if (!searchText || searchText.trim() === "") {
      // Show all
      shortCodeColors.forEach((_, code) => {
        possessionVisibility.set(code, true);
      });
    } else {
      const search = searchText.toLowerCase().trim();
      shortCodeColors.forEach((_, code) => {
        const details = possessionDetails.get(code) || {};
        const searchableText = [
          code,
          details.description || "",
          details.locations || "",
          details.workstation || "",
          details.possessionNumber || "",
        ].join(" ").toLowerCase();

        possessionVisibility.set(code, searchableText.includes(search));
      });
    }

    // Update calendar events
    if (window.calendar) {
      window.calendar.getEvents().forEach(ev => {
        if (ev.extendedProps?.isFootprint) {
          const code = ev.extendedProps.shortCode;
          const visible = possessionVisibility.get(code) !== false;
          ev.setProp("display", visible ? "auto" : "none");
        }
      });
    }
  };

  /**
   * Get unique frequencies from loaded data
   */
  window.MST.Footprint.getUniqueFrequencies = function() {
    const frequencies = new Set();
    possessionDetails.forEach((details) => {
      if (details.frequency) {
        frequencies.add(details.frequency);
      }
    });
    return Array.from(frequencies).sort();
  };

  /**
   * Filter by frequency
   */
  window.MST.Footprint.filterByFrequency = function(freq) {
    if (!freq || freq === "all") {
      // Show all
      shortCodeColors.forEach((_, code) => {
        possessionVisibility.set(code, true);
      });
    } else {
      shortCodeColors.forEach((_, code) => {
        const details = possessionDetails.get(code) || {};
        possessionVisibility.set(code, details.frequency === freq);
      });
    }

    // Update calendar events
    if (window.calendar) {
      window.calendar.getEvents().forEach(ev => {
        if (ev.extendedProps?.isFootprint) {
          const code = ev.extendedProps.shortCode;
          const visible = possessionVisibility.get(code) !== false;
          ev.setProp("display", visible ? "auto" : "none");
        }
      });
    }
  };

  /**
   * Toggle visibility of a specific possession code
   */
  window.MST.Footprint.togglePossession = function(code, visible) {
    possessionVisibility.set(code, visible);

    // Update existing events on calendar
    if (window.calendar) {
      window.calendar.getEvents().forEach(ev => {
        if (ev.extendedProps?.isFootprint && ev.extendedProps?.shortCode === code) {
          ev.setProp("display", visible ? "auto" : "none");
        }
      });
    }
  };

  /**
   * Set all possessions visible or hidden
   */
  window.MST.Footprint.setAllVisible = function(visible) {
    shortCodeColors.forEach((_, code) => {
      possessionVisibility.set(code, visible);
    });

    if (window.calendar) {
      window.calendar.getEvents().forEach(ev => {
        if (ev.extendedProps?.isFootprint) {
          ev.setProp("display", visible ? "auto" : "none");
        }
      });
    }
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
