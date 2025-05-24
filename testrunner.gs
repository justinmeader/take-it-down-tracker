/**
 * testRunner.gs
 * Logs sheet names and headers before and after running migration.
 * Usage: Run testRunner() from the Apps Script editor.
 */

function testRunner() {
  // Run all test cases
  testImportToTracker();
  testMigrationLogic();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let pre = logSheetHeaders('BEFORE');

  // Run migration (if present)
  if (typeof runMigrations === 'function') {
    runMigrations();
  }

  let post = logSheetHeaders('AFTER');
  SpreadsheetApp.getUi().alert('Sheet headers logged to Logger.\nCheck View > Logs for details.');
}

/**
 * Logs all sheet names and their header rows to the Logger.
 * @param {string} phase - 'BEFORE' or 'AFTER'
 * @returns {Array<{sheet: string, headers: Array<string>}>}
 */
function logSheetHeaders(phase) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  let out = [];
  Logger.log('--- ' + phase + ' MIGRATION ---');
  sheets.forEach(sheet => {
    const name = sheet.getName();
    const lastCol = sheet.getLastColumn();
    let headers = [];
    if (lastCol > 0) {
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }
    Logger.log('Sheet: ' + name + ' | Headers: ' + JSON.stringify(headers));
    out.push({sheet: name, headers: headers});
  });
  return out;
}

/**
 * Example test: Validate importToTracker handles headers and errors gracefully.
 */
function testImportToTracker() {
  try {
    // Setup: create a mock sheet or use a test sheet
    // (You may need to manually create a 'Inbox' sheet for this to work)
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const inbox = ss.getSheetByName('Inbox');
    if (!inbox) throw new Error('Inbox sheet missing');
    // Call importToTracker and check for errors
    importToTracker();
    Logger.log('testImportToTracker: PASSED');
  } catch (e) {
    logError('testImportToTracker', '', e.message);
    Logger.log('testImportToTracker: FAILED - ' + e.message);
  }
}

/**
 * Example test: Validate migration logic runs without error.
 */
function testMigrationLogic() {
  try {
    if (typeof runMigrations === 'function') {
      runMigrations();
      Logger.log('testMigrationLogic: PASSED');
    } else {
      Logger.log('testMigrationLogic: SKIPPED - runMigrations not defined');
    }
  } catch (e) {
    logError('testMigrationLogic', '', e.message);
    Logger.log('testMigrationLogic: FAILED - ' + e.message);
  }
}
