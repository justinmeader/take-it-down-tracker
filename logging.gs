// logging.gs

/**
 * Appends a structured log entry to the Logs sheet.
 * @param {'INFO'|'WARN'|'ERROR'} level - Log level.
 * @param {string} operation - Operation name.
 * @param {string} id - Associated record ID or context.
 * @param {string} message - Message to log.
 */
function logEntry(level, operation, id, message) {
  const { SHEET_LOGS, LOGS_HEADERS, assert } = getGlobals();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logs = ss.getSheetByName(SHEET_LOGS);
  assert(logs, 'Logs sheet missing');
  logs.appendRow([
    new Date(),
    operation || '',
    id || '',
    level,
    message || ''
  ]);
}

/**
 * Appends an INFO log to the Logs sheet.
 * @param {string} operation
 * @param {string} id
 * @param {string} message
 */
function logInfo(operation, id, message) {
  logEntry('INFO', operation, id, message);
}

/**
 * Appends a WARN log to the Logs sheet.
 * @param {string} operation
 * @param {string} id
 * @param {string} message
 */
function logWarn(operation, id, message) {
  logEntry('WARN', operation, id, message);
}

/**
 * Appends an ERROR log to the Logs sheet.
 * @param {string} operation
 * @param {string} id
 * @param {string} message
 */
function logError(operation, id, message) {
  logEntry('ERROR', operation, id, message);
}

/**
 * Batch log writing: accepts array of log objects {level, operation, id, message}
 * @param {Array<{level:string,operation:string,id:string,message:string}>} logArray
 */
function logBatchInfo(logArray) {
  const { SHEET_LOGS, LOGS_HEADERS, assert } = getGlobals();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logs = ss.getSheetByName(SHEET_LOGS);
  assert(logs, 'Logs sheet missing');
  const rows = logArray.map(entry => [
    new Date(),
    entry.operation || '',
    entry.id || '',
    entry.level || 'INFO',
    entry.message || ''
  ]);
  if (rows.length) logs.getRange(logs.getLastRow()+1, 1, rows.length, LOGS_HEADERS.length).setValues(rows);
}

/**
 * Prunes log sheet to last N entries (default: 1000).
 * Can be called from menu or trigger.
 * @param {number} [maxRows=1000]
 */
function pruneLogs(maxRows = 1000) {
  const { SHEET_LOGS, assert } = getGlobals();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logs = ss.getSheetByName(SHEET_LOGS);
  assert(logs, 'Logs sheet missing');
  const lastRow = logs.getLastRow();
  if (lastRow > maxRows + 1) {
    logs.deleteRows(2, lastRow - maxRows - 1);
  }
}

/**
 * Ensures the Change Log sheet exists and has correct headers.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function ensureChangeLogSheet() {
  const { assert } = getGlobals();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Change Log');
  const { CHANGE_LOG_HEADERS } = getGlobals();
  if (!sheet) {
    sheet = ss.insertSheet('Change Log');
    sheet.appendRow(CHANGE_LOG_HEADERS);
  } else {
    // If sheet exists but headers are wrong, fix them
    const currHeaders = sheet.getRange(1, 1, 1, CHANGE_LOG_HEADERS.length).getValues()[0];
    for (let i = 0; i < CHANGE_LOG_HEADERS.length; i++) {
      if (!currHeaders[i] || currHeaders[i] !== CHANGE_LOG_HEADERS[i]) {
        sheet.getRange(1, i + 1).setValue(CHANGE_LOG_HEADERS[i]);
      }
    }
  }
  return sheet;
}

/**
 * Appends a single entry to the Change Log sheet.
 * @param {string} action - Description of the action (e.g., "Import", "Archive", "DMCA Sent")
 * @param {string} trackerId - The unique ID (e.g., TID-000123)
 * @param {string} domain - Domain for context
 * @param {string} url - URL for context
 * @param {string} message - Optional extra info
 */
function logChange(action, trackerId, domain, url, message) {
  const sheet = ensureChangeLogSheet();
  sheet.appendRow([
    new Date(),
    action || '',
    trackerId || '',
    domain || '',
    url || '',
    message || ''
  ]);
}

/**
 * Batch logging to Change Log.
 * Accepts an array of objects: {action, trackerId, domain, url, message}
 * @param {Array<Object>} logArray
 */
function logBatchChange(logArray) {
  const sheet = ensureChangeLogSheet();
  const rows = logArray.map(entry => [
    new Date(),
    entry.action || '',
    entry.trackerId || '',
    entry.domain || '',
    entry.url || '',
    entry.message || ''
  ]);
  if (rows.length) sheet.getRange(sheet.getLastRow()+1, 1, rows.length, 6).setValues(rows);
}

/**
 * Prune the Change Log to last N entries (default: 5000).
 */
function pruneChangeLog(maxRows = 5000) {
  const sheet = ensureChangeLogSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow > maxRows + 1) {
    sheet.deleteRows(2, lastRow - maxRows - 1);
  }
}
