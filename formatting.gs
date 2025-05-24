// formatting.gs

/**
 * Applies validation, formatting, column widths, freezes, protects headers, and number formats across all core sheets.
 * Adds dropdowns to known columns in Tracker and Inbox.
 */
function applyAllValidationAndFormatting() {
  try {
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
      // Freeze header
      sheet.setFrozenRows(1);
      // Bold header
      sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      // Protect header
      try { SheetUtils.protectRange(sheet, 1); } catch (e) { /* ignore */ }
      // Set default column width (optional: adjust as needed)
      SheetUtils.setColumnWidths(sheet, Array(headers.length).fill(180));
      // Clear number formats (reset to default)
      sheet.getDataRange().setNumberFormat('@');
      // Add dropdowns for known columns
      if (name === SHEET_TRACKER) {
        // Media Type dropdown on correct col
        SheetUtils.addDropdown(sheet, headers.indexOf('Media Type'), ['Image', 'Video', 'Page']);
        // Current Status dropdown
        SheetUtils.addDropdown(sheet, headers.indexOf('Current Status'), ['Notice Sent', 'Deadline Exceeded', 'Removed']);
      }
      if (name === SHEET_INBOX) {
        // Intake Type dropdown
        SheetUtils.addDropdown(sheet, headers.indexOf('Intake Type'), ['User', 'Automated', 'Other']);
        // Reviewed? dropdown
        SheetUtils.addDropdown(sheet, headers.indexOf('Reviewed?'), ['TRUE', 'FALSE']);
      }
    });
  } catch (e) {
    logError('applyAllValidationAndFormatting', '', e.message);
    SpreadsheetApp.getUi().alert('Error applying validation and formatting: ' + e.message);
  }
}
  