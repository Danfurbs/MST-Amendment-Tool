// =============================================
// MST VARIABLE LIBRARY
// Central repository for all static MST lists
// =============================================

window.MST_VARIABLES = {
  // -----------------------------------------------------
  // 🔹 WORK GROUPS
  // -----------------------------------------------------
  workGroups: [
    "DBCCARE",
    "DBCCARK",
    "DBCCMER",
    "DBCCLIV",
    "DBCCPRE",
    "DBCCWIG",
    "DBCCBLK"
  ],

  // -----------------------------------------------------
  // 🔹 JOB DESCRIPTION CODES
  // -----------------------------------------------------
jobDescCodes: [
  { code: "1E", desc: "238 days tolerance", tol: 238 },
  { code: "1F", desc: "546 days tolerance", tol: 546 },
  { code: "1G", desc: "168 day tolerance", tol: 168 },
  { code: "K9", desc: "14 day Tolerance", tol: 14 },
  { code: "R0", desc: "Track RBM work arising", tol: 0 },
  { code: "R1", desc: "Track RBM 1 day tolerance", tol: 1 },
  { code: "R2", desc: "Track RBM 3 day tolerance", tol: 3 },
  { code: "R3", desc: "Track RBM 7 day tolerance", tol: 7 },
  { code: "R4", desc: "Track RBM 14 day tolerance", tol: 14 },
  { code: "R5", desc: "Track RBM 21 day tolerance", tol: 21 },
  { code: "R6", desc: "Track RBM 28 day tolerance", tol: 28 },
  { code: "R7", desc: "Track RBM 42 day tolerance", tol: 42 },
  { code: "R8", desc: "Track RBM 56 day tolerance", tol: 56 },
  { code: "R9", desc: "Track RBM 112 day tolerance", tol: 112 },
  { code: "Y1", desc: "42 day Tolerance", tol: 42 },
  { code: "Y2", desc: "56 day Tolerance", tol: 56 },
  { code: "Y3", desc: "112 day Tolerance", tol: 112 },
  { code: "Y5", desc: "21 day Tolerance", tol: 21 },
  { code: "YA", desc: "1 day Tolerance", tol: 1 },
  { code: "YC", desc: "3 day Tolerance", tol: 3 },
  { code: "YE", desc: "7 day Tolerance", tol: 7 },
  { code: "YQ", desc: "0 day Tolerance", tol: 0 },
  { code: "YR", desc: "5 day tolerance", tol: 5 },
  { code: "YS", desc: "10 day tolerance", tol: 10 },
  { code: "YT", desc: "36 day tolerance", tol: 36 },
  { code: "YU", desc: "146 day tolerance", tol: 146 },
  { code: "YV", desc: "255 day tolerance", tol: 255 },
  { code: "YW", desc: "365 day tolerance", tol: 365 },
  { code: "YX", desc: "511 day tolerance", tol: 511 },
  { code: "Z0", desc: "819 day tolerance", tol: 819 },
  { code: "Z1", desc: "252 day Tolerance", tol: 252 },
  { code: "Z2", desc: "364 day Tolerance", tol: 364 },
  { code: "Z3", desc: "23 day tolerance", tol: 23 },
  { code: "Z4", desc: "46 day tolerance", tol: 46 },
  { code: "Z5", desc: "273 day tolerance", tol: 273 },
  { code: "Z7", desc: "455 day tolerance", tol: 455 },
  { code: "Z8", desc: "637 day tolerance", tol: 637 },
  { code: "Z9", desc: "728 day tolerance", tol: 728 },
  { code: "ZA", desc: "150 day Tolerance", tol: 150 },
  { code: "ZB", desc: "240 day Tolerance", tol: 240 },
  { code: "ZC", desc: "450 day Tolerance", tol: 450 },
  { code: "ZD", desc: "290 day Tolerance", tol: 290 },
  { code: "ZH", desc: "28 day Tolerance", tol: 28 },
  { code: "ZJ", desc: "24 day Tolerance", tol: 24 },
  { code: "ZN", desc: "84 day Tolerance", tol: 84 },
  { code: "ZP", desc: "910 day Tolerance", tol: 910 },
  { code: "ZQ", desc: "91 day Tolerance", tol: 91 },
  { code: "ZR", desc: "1274 day Tolerance", tol: 1274 },
  { code: "ZS", desc: "35 day Tolerance", tol: 35 },
  { code: "ZT", desc: "70 day Tolerance", tol: 70 },
  { code: "ZU", desc: "182 day Tolerance", tol: 182 },
  { code: "ZV", desc: "98 day Tolerance", tol: 98 },
  { code: "ZW", desc: "140 day Tolerance", tol: 140 },
  { code: "ZX", desc: "196 day Tolerance", tol: 196 },
  { code: "ZY", desc: "6 day Tolerance", tol: 6 },
  { code: "ZZ", desc: "126 day Tolerance", tol: 126 }
],

  // -----------------------------------------------------
  // 🔹 PROTECTION TYPES (W8 Table)
  // -----------------------------------------------------
 protectionTypes: [
  { code: "G1", desc: "Safeguarded" },
  { code: "G2", desc: "Fenced" },
  { code: "G3", desc: "Separated" },
  { code: "G4", desc: "IWA - Protection Safe System Arrangement" },
  { code: "NR", desc: "Protection Not Required" },
  { code: "R1", desc: "Warning + Fixed SATWS" },
  { code: "R2", desc: "Warning + Fixed ATWS" },
  { code: "R4", desc: "Warning + Portable SATWS" },
  { code: "R5", desc: "Warning + TOWS + other as/if req'd" },
  { code: "R6", desc: "Warning + LOWS" },
  //{ code: "R7", desc: "INACTIVE - Red + lookout + peewee" },
  { code: "R8", desc: "Warning Unassisted Lookout" },
  { code: "R9", desc: "IWA - Warning Safe System Arrangement" },
  { code: "WL", desc: "Working Lineside within NR Boundary" },
  { code: "WO", desc: "Working Outside NR Boundary" },
  { code: "WP", desc: "Warning + Portable TPWS" },
  { code: "WQ", desc: "Warning + Signal Controlled" }
],

  // -----------------------------------------------------
  // 🔹 PROTECTION METHODS (W9 Table)
  // -----------------------------------------------------
protectionMethods: [
  { code: "01", desc: "Line Blockage (Simple)" },
  { code: "02", desc: "Line Blockage + T-COD (Manual)" },
  { code: "03", desc: "Line Blockage + Disconnect" },
  { code: "04", desc: "Line Blockage + Detonators" },
  { code: "05", desc: "Line Blockage + Token" },
  { code: "06", desc: "Line Blockage + ERTMS / Route Bar" },
  { code: "07", desc: "Line Blockage + LOD" },
  { code: "08", desc: "Line Blockage (Incident Response)" },
  { code: "09", desc: "Possession" },
  { code: "10", desc: "Sidings Possession" },
  { code: "11", desc: "Line Blockage + EPR" },
  //{ code: "12", desc: "INACTIVE - Line Blockage + LEWiS" },
  { code: "13", desc: "Line Blockage + ZKL" },
  { code: "14", desc: "Line Block + Absolute Block" },
  { code: "15", desc: "Line Blockage + T-COD Fixed Installed" },
  { code: "16", desc: "Line Blockage + T-COD Scottish Tokenless" },
  { code: "17", desc: "Line Blockage + T-COD Remote Control" },
  { code: "18", desc: "Line Blockage + Remote Disconnection Device" },
  { code: "19", desc: "Line Blockage + Signal Post Replacement" },
  { code: "20", desc: "Line Blockage + T-COD English Tokenless" },
  { code: "21", desc: "Possession with engineering controls (T3-E)" },
  { code: "22", desc: "Possession With Disconnection (T3-D)" },
  { code: "23", desc: "Published Line Blockage - Simple" },
  { code: "24", desc: "Published Line Blockage - Additional Protection" },
  { code: "25", desc: "Sidings Possession With Engineering Controls" },
  { code: "NR", desc: "No Block Required" }
],


  // -----------------------------------------------------
  // 🔹 OTHER RESERVED VALUES
  // -----------------------------------------------------
  defaultFrequency: 7, // e.g. default MST frequency
  maxInstances: 10,    // how many future events to show (lazy loaded)

  // Lazy loading configuration
  lazyLoading: {
    enabled: true,     // Enable/disable lazy loading of future instances
    bufferDays: 60     // Days before/after visible range to pre-load
  },

  // Simplified color scheme (2 colors)
  colorScheme: {
    base: "#10b981",   // green - base/current instance
    future: "#a78bfa"  // light purple - all future instances
  }
};

// =============================================
// Usage Example (in main HTML script):
//   const wgOptions = MST_VARIABLES.workGroups;
//   const protTypes = MST_VARIABLES.protectionTypes;
// =============================================
