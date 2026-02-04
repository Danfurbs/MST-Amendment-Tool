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
  { code: "1E", desc: "238 days tolerance" },
  { code: "1F", desc: "546 days tolerance" },
  { code: "1G", desc: "168 day tolerance" },
  { code: "K9", desc: "14 day Tolerance" },
  { code: "R0", desc: "Track RBM work arising" },
  { code: "R1", desc: "Track RBM 1 day tolerance" },
  { code: "R2", desc: "Track RBM 3 day tolerance" },
  { code: "R3", desc: "Track RBM 7 day tolerance" },
  { code: "R4", desc: "Track RBM 14 day tolerance" },
  { code: "R5", desc: "Track RBM 21 day tolerance" },
  { code: "R6", desc: "Track RBM 28 day tolerance" },
  { code: "R7", desc: "Track RBM 42 day tolerance" },
  { code: "R8", desc: "Track RBM 56 day tolerance" },
  { code: "R9", desc: "Track RBM 112 day tolerance" },
  { code: "Y1", desc: "42 day Tolerance" },
  { code: "Y2", desc: "56 day Tolerance" },
  { code: "Y3", desc: "112 day Tolerance" },
  { code: "Y5", desc: "21 day Tolerance" },
  { code: "YA", desc: "1 day Tolerance" },
  { code: "YC", desc: "3 day Tolerance" },
  { code: "YE", desc: "7 day Tolerance" },
  { code: "YQ", desc: "0 day Tolerance" },
  { code: "YR", desc: "5 day tolerance" },
  { code: "YS", desc: "10 day tolerance" },
  { code: "YT", desc: "36 day tolerance" },
  { code: "YU", desc: "146 day tolerance" },
  { code: "YV", desc: "255 day tolerance" },
  { code: "YW", desc: "365 day tolerance" },
  { code: "YX", desc: "511 day tolerance" },
  { code: "Z0", desc: "819 day tolerance" },
  { code: "Z1", desc: "252 day Tolerance" },
  { code: "Z2", desc: "364 day Tolerance" },
  { code: "Z3", desc: "23 day tolerance" },
  { code: "Z4", desc: "46 day tolerance" },
  { code: "Z5", desc: "273 day tolerance" },
  { code: "Z7", desc: "455 day tolerance" },
  { code: "Z8", desc: "637 day tolerance" },
  { code: "Z9", desc: "728 day tolerance" },
  { code: "ZA", desc: "150 day Tolerance" },
  { code: "ZB", desc: "240 day Tolerance" },
  { code: "ZC", desc: "450 day Tolerance" },
  { code: "ZD", desc: "290 day Tolerance" },
  { code: "ZH", desc: "28 day Tolerance" },
  { code: "ZJ", desc: "24 day Tolerance" },
  { code: "ZN", desc: "84 day Tolerance" },
  { code: "ZP", desc: "910 day Tolerance" },
  { code: "ZQ", desc: "91 day Tolerance" },
  { code: "ZR", desc: "1274 day Tolerance" },
  { code: "ZS", desc: "35 day Tolerance" },
  { code: "ZT", desc: "70 day Tolerance" },
  { code: "ZU", desc: "182 day Tolerance" },
  { code: "ZV", desc: "98 day Tolerance" },
  { code: "ZW", desc: "140 day Tolerance" },
  { code: "ZX", desc: "196 day Tolerance" },
  { code: "ZY", desc: "6 day Tolerance" },
  { code: "ZZ", desc: "126 day Tolerance" }
],

  // -----------------------------------------------------
  // 🔹 PROTECTION TYPES
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
  // 🔹 PROTECTION METHODS
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
  { code: "22", desc: "Possession With Disconnection (T3-D)" },
  { code: "23", desc: "Published Line Blockage - Simple" },
  { code: "24", desc: "Published Line Blockage - Additional Protection" },
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
    future: "#6b7280"  // grey - all future instances
  }
};

// =============================================
// Usage Example (in main HTML script):
//   const wgOptions = MST_VARIABLES.workGroups;
//   const protTypes = MST_VARIABLES.protectionTypes;
// =============================================
