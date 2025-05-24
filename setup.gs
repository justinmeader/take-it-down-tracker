// setup.gs

/**
 * (Re)creates all core sheets with headers and validation.
 * Never deletes any sheets listed in SHEET_PROTECTED.
 * Seeds settings and country codes, applies formatting/validation.
 */
function setupWorkbookFromScratch() {
  try {
    const {
      SHEET_INBOX, SHEET_TRACKER, SHEET_ARCHIVE, SHEET_DIRECTORY,
      SHEET_SEARCH_DEINDEX, SHEET_TRIAGE, SHEET_STATUS, SHEET_LOGS,
      SHEET_SETTINGS, SHEET_COUNTRY_CODES, SHEET_PROTECTED,
      INBOX_HEADERS, TRACKER_HEADERS, ARCHIVE_HEADERS, DIRECTORY_HEADERS,
      SEARCH_DEINDEX_HEADERS, TRIAGE_HEADERS, STATUS_HEADERS, LOGS_HEADERS, SETTINGS_HEADERS,
      assert, flushConfigCache
    } = getGlobals();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    /**
     * Deletes all sheets except those in SHEET_PROTECTED.
     * @param {SpreadsheetApp.Spreadsheet} ss
     * @param {string[]} protectedNames
     */
    function deleteUnprotectedSheets(ss, protectedNames) {
      ss.getSheets().forEach(sheet => {
        if (!protectedNames.includes(sheet.getName())) ss.deleteSheet(sheet);
      });
    }

    // 1. Delete all unprotected sheets
    deleteUnprotectedSheets(ss, SHEET_PROTECTED);

    // 2. (Re)create all core sheets with headers
    const sheetsToHeaders = [
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
    sheetsToHeaders.forEach(([name, headers]) => {
      let sheet = SheetUtils.ensureSheet(name);
      SheetUtils.clearAndHeader(sheet, headers);
    });

    // 3. Seed Settings and Country Codes
    const settingsSheet = ss.getSheetByName(SHEET_SETTINGS);
    const settingsSeed = [
      ['Batch_Size', 20],
      ['Download_Root_Folder', 'Take It Down Evidence'],
      ['Download_Interval_Min', 15],
      ['Email_Sender', Session.getActiveUser().getEmail()],
      ['Date_Format', 'yyyy-MM-dd'],
      ['Dry_Run', false]
    ];
    settingsSheet.getRange(2,1,settingsSeed.length,2).setValues(settingsSeed);

    const countryCodesSheet = ss.getSheetByName(SHEET_COUNTRY_CODES);
    const codes = [
      ['US','United States'], ['CA','Canada'], ['GB','United Kingdom'], ['DE','Germany'], ['FR','France'],
      ['ES','Spain'], ['IT','Italy'], ['JP','Japan'], ['CN','China'], ['IN','India']
      // ... Add as needed
    ];
    countryCodesSheet.getRange(2,1,codes.length,2).setValues(codes);

    // 4. Apply all validation and formatting
    applyAllValidationAndFormatting();

    flushConfigCache();
    SpreadsheetApp.getActive().toast('Workbook rebuilt and initialized.', 'Take It Down', 5);
  } catch (e) {
    logError('setupWorkbookFromScratch', '', e.message);
    SpreadsheetApp.getUi().alert('Error during setup: ' + e.message);
  }
}
