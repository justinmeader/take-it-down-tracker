// config.gs

/**
 * Sheet names (all used in the workflow)
 * @constant
 */
const SHEET_INBOX         = 'Inbox';
const SHEET_TRACKER       = 'Tracker';
const SHEET_ARCHIVE       = 'Archive';
const SHEET_DIRECTORY     = 'Directory';
const SHEET_SEARCH_DEINDEX = 'Search Deindex';
const SHEET_TRIAGE        = 'Triage';
const SHEET_STATUS        = 'Status';
const SHEET_LOGS          = 'Logs';
const SHEET_SETTINGS      = 'Settings';
const SHEET_COUNTRY_CODES = 'Country Codes';

/**
 * List of sheet names that must never be deleted or overwritten by automated scripts.
 * Add any new workspace/dashboard sheets here.
 * @constant
 * @type {string[]}
 */
const SHEET_PROTECTED = ['Dashboard', 'URL Dump Zone', 'Temp'];

/**
 * Column headers for each core sheet.
 * @constant
 * @type {string[]}
 */
const INBOX_HEADERS = [
  'Reviewed?', 'URL', 'Intake Type', 'DMCA', 'Domain Tag', 'Notes', 'Imported?'
];
const TRACKER_HEADERS = [
  'ID', 'Domain', 'URL', 'DMCA Contact', 'WHOIS Host', 'Date Sent', 'Deadline',
  'Current Status', 'Media Type', 'Drive Link', 'Download Status', 'Hash', 'Notes'
];
const ARCHIVE_HEADERS = [
  'ID', 'Domain', 'URL', 'DMCA Contact', 'WHOIS Host', 'Date Sent', 'Deadline',
  'Current Status', 'Media Type', 'Drive Link', 'Download Status', 'Hash', 'Notes', 'Date Archived'
];
const DIRECTORY_HEADERS = [
  'Domain', 'Registrar', 'Abuse Contact', 'Country', 'Notes', 'Last Checked'
];
const STATUS_HEADERS = [
  'Heartbeat', 'Last Run', 'Last Import', 'Last Download', 'Last Hash', 'Last Audit', 'Last Archive'
];
const LOGS_HEADERS = [
  'Timestamp', 'Operation', 'ID', 'Level', 'Message'
];
const SETTINGS_HEADERS = [
  'Key', 'Value'
];
const SEARCH_DEINDEX_HEADERS = [
  'Search Engine', 'URL', 'Date Requested', 'Status', 'Notes'
];
const TRIAGE_HEADERS = [
  'Flagged?', 'URL', 'Flag Type', 'Reason', 'Notes'
];

/**
 * Column index map for Tracker sheet (zero-based for Apps Script getRange).
 * @constant
 * @type {Object.<string, number>}
 */
const TRACKER_COL = {
  ID: 0,
  Domain: 1,
  URL: 2,
  DMCA_Contact: 3,
  WHOIS_Host: 4,
  Date_Sent: 5,
  Deadline: 6,
  Current_Status: 7,
  Media_Type: 8,
  Drive_Link: 9,
  Download_Status: 10,
  Hash: 11,
  Notes: 12
};

/**
 * Status string literals.
 * @constant
 * @type {string}
 */
const STATUS_SENT        = 'Notice Sent';
const STATUS_REMOVED     = 'Removed';
const STATUS_DEADLINE    = 'Deadline Exceeded';

/**
 * Menu schema: item names map to function names.
 * Only actionable functions are included.
 * @constant
 * @type {Array.<{name: string, function: string}>}
 */
const MENU_SCHEMA = [
  {name: "Import Reviewed to Tracker", function: "importToTracker"},
  {name: "Stamp Date Sent (Selected)", function: "stampDateSent"},
  {name: "Download Media to Drive", function: "downloadMediaToDrive"},
  {name: "Start Scheduled Download", function: "startScheduledDownload"},
  {name: "Stop Scheduled Download", function: "stopScheduledDownload"},
  {name: "Bulk Hash Existing Downloads", function: "bulkHashExistingDownloads"},
  {name: "Archive Removed Rows", function: "archiveRemovedRows"},
  {name: "Audit Deadlines", function: "auditDeadlines"},
  {name: "Schedule Audit Deadlines", function: "scheduleAuditDeadlines"},
  {name: "Cancel Deadline Audit Schedule", function: "cancelAuditDeadlinesSchedule"},
  {name: "Run Migration/Upgrade", function: "migrateWorkbook"},
  {name: "Rebuild All Sheets (Destructive!)", function: "setupWorkbookFromScratch"},
  {name: "Heal All Sheet Schemas", function: "healSheetSchemas"},
  {name: "Show Recent Errors", function: "showRecentErrorsDialog"},
  {name: "Prune Logs", function: "pruneLogsMenu"},
  {name: "Prune Archive", function: "pruneArchiveMenu"},
  {name: "Go to Status Sheet", function: "goToStatusSheet"},
  {name: "Help / About", function: "showHelpMenu"}
];

/**
 * Settings keys used in the Settings sheet.
 * @constant
 * @type {string}
 */
const SETTING_BATCH_SIZE        = 'Batch_Size';
const SETTING_DOWNLOAD_ROOT     = 'Download_Root_Folder';
const SETTING_DOWNLOAD_INTERVAL = 'Download_Interval_Min';
const SETTING_EMAIL_SENDER      = 'Email_Sender';
const SETTING_DATE_FORMAT       = 'Date_Format';
const SETTING_DRY_RUN           = 'Dry_Run';

/**
 * PropertyService keys for IDs, caches, etc.
 * @constant
 * @type {string}
 */
const PROP_NEXT_ID       = 'Next_Tracker_Id';
const PROP_LAST_RUN      = 'Last_Run';

/**
 * Asserts a condition; throws an error with the given message if falsy.
 * @param {boolean} condition
 * @param {string} message
 * @throws {Error}
 */
function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

/**
 * Reads all configuration from the Settings sheet and caches result.
 * @param {boolean} [force] - If true, bypasses cache and reloads settings.
 * @returns {Object.<string, any>} Key-value config object.
 */
let CONFIG_CACHE = null;
function readConfig(force) {
  if (CONFIG_CACHE && !force) return CONFIG_CACHE;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const settings = ss.getSheetByName(SHEET_SETTINGS);
  assert(settings, 'Settings sheet missing');
  const kv = settings.getRange(2,1,settings.getLastRow()-1,2).getValues();
  const cfg = {};
  kv.forEach(([k,v]) => { if(k) cfg[k] = v; });
  // Defaults
  cfg[SETTING_BATCH_SIZE]        = parseInt(cfg[SETTING_BATCH_SIZE])    || 20;
  cfg[SETTING_DOWNLOAD_ROOT]     = cfg[SETTING_DOWNLOAD_ROOT]           || 'Take It Down Evidence';
  cfg[SETTING_DOWNLOAD_INTERVAL] = parseInt(cfg[SETTING_DOWNLOAD_INTERVAL]) || 15;
  cfg[SETTING_DATE_FORMAT]       = cfg[SETTING_DATE_FORMAT]             || 'yyyy-MM-dd';
  cfg[SETTING_EMAIL_SENDER]      = cfg[SETTING_EMAIL_SENDER]            || Session.getActiveUser().getEmail();
  cfg[SETTING_DRY_RUN]           = !!cfg[SETTING_DRY_RUN];
  CONFIG_CACHE = cfg;
  return cfg;
}

/**
 * Clears the config cache (forces reload on next readConfig call).
 */
function flushConfigCache() {
  CONFIG_CACHE = null;
}

/**
 * Generates and increments the next unique Tracker ID (e.g., TID-000001).
 * @returns {string} New unique ID.
 */
function getNextId() {
  const props = PropertiesService.getDocumentProperties();
  let next = parseInt(props.getProperty(PROP_NEXT_ID) || "1");
  const result = `TID-${next.toString().padStart(6, '0')}`;
  props.setProperty(PROP_NEXT_ID, (next+1).toString());
  return result;
}

/**
 * Updates a status message in the Status sheet, by field name.
 * @param {string} field - One of the STATUS_HEADERS.
 * @param {string} message - Status message or timestamp.
 */
function updateStatusMessage(field, message) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const status = ss.getSheetByName(SHEET_STATUS);
  assert(status, 'Status sheet missing');
  // find column for field
  let col = STATUS_HEADERS.indexOf(field);
  if (col === -1) throw new Error('Invalid status field: ' + field);
  status.getRange(2, col+1).setValue(message);
}

/**
 * Returns an object containing all config constants, headers, and helpers.
 * @returns {Object}
 */
function getGlobals() {
  return {
    SHEET_INBOX, SHEET_TRACKER, SHEET_ARCHIVE, SHEET_DIRECTORY, SHEET_SEARCH_DEINDEX, SHEET_TRIAGE,
    SHEET_STATUS, SHEET_LOGS, SHEET_SETTINGS, SHEET_COUNTRY_CODES, SHEET_PROTECTED,
    INBOX_HEADERS, TRACKER_HEADERS, ARCHIVE_HEADERS, DIRECTORY_HEADERS, STATUS_HEADERS, LOGS_HEADERS,
    SETTINGS_HEADERS, SEARCH_DEINDEX_HEADERS, TRIAGE_HEADERS, TRACKER_COL,
    STATUS_SENT, STATUS_REMOVED, STATUS_DEADLINE, MENU_SCHEMA,
    SETTING_BATCH_SIZE, SETTING_DOWNLOAD_ROOT, SETTING_DOWNLOAD_INTERVAL,
    SETTING_EMAIL_SENDER, SETTING_DATE_FORMAT, SETTING_DRY_RUN,
    PROP_NEXT_ID, PROP_LAST_RUN,
    assert, readConfig, flushConfigCache, getNextId, updateStatusMessage, healSheetSchemas
  };
}

/**
 * Checks and heals all core sheets to ensure headers and dropdowns are present.
 * Fixes header drift, missing columns, and re-applies validation as needed.
 * Called on every onOpen (via ui.gs).
 */
function healSheetSchemas() {
  const {
    SHEET_INBOX, SHEET_TRACKER, SHEET_ARCHIVE, SHEET_DIRECTORY,
    SHEET_SEARCH_DEINDEX, SHEET_TRIAGE, SHEET_STATUS, SHEET_LOGS,
    SHEET_SETTINGS, SHEET_COUNTRY_CODES,
    INBOX_HEADERS, TRACKER_HEADERS, ARCHIVE_HEADERS, DIRECTORY_HEADERS,
    SEARCH_DEINDEX_HEADERS, TRIAGE_HEADERS, STATUS_HEADERS, LOGS_HEADERS, SETTINGS_HEADERS,
    assert
  } = getGlobals();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  /**
   * All core sheets and their expected headers.
   * @type {Array<[string, string[]]>}
   */
  const sheets = [
    [SHEET_INBOX, INBOX_HEADERS],
    [SHEET_TRACKER, TRACKER_HEADERS],
    [SHEET_ARCHIVE, ARCHIVE_HEADERS],
    [SHEET_DIRECTORY, DIRECTORY_HEADERS],
    [SHEET_SEARCH_DEINDEX, SEARCH_DEINDEX_HEADERS],
    [SHEET_TRIAGE, TRIAGE_HEADERS],
    [SHEET_STATUS, STATUS_HEADERS],
    [SHEET_LOGS, LOGS_HEADERS],
    [SHEET_SETTINGS, SETTINGS_HEADERS],
    [SHEET_COUNTRY_CODES, ['Country Code', 'Country Name']]
  ];

  sheets.forEach(([name, headers]) => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const currHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    // Add missing columns (to right)
    let changed = false;
    for (let i = 0; i < headers.length; i++) {
      if (!currHeaders[i] || currHeaders[i] !== headers[i]) {
        sheet.getRange(1, i + 1).setValue(headers[i]);
        changed = true;
      }
    }
    // If extra columns (to the right), clear their headers
    if (currHeaders.length > headers.length) {
      sheet.getRange(1, headers.length + 1, 1, currHeaders.length - headers.length).clearContent();
      changed = true;
    }
    // Optionally: Add dropdowns, formatting, etc.
    if (changed) {
      SpreadsheetApp.getActive().toast(`Healed schema: ${name}`, 'Take It Down', 3);
    }
  });
}
