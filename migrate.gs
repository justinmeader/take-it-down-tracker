/**
 * migrate.gs
 * Comprehensive migration script to:
 * - Rename legacy sheets to canonical names
 * - Adjust columns to match canonical headers from setup.gs
 * - Preserve data where possible, add missing columns, remove obsolete ones
 * - Idempotent and safe to run multiple times
 */

function runMigrations() {
  try {
  migrateSheetNamesAndLayouts();
  migrateColumnNames();
  migrateDomainTags();
  migrateMediaType();
  migrateRemovedToStatus();
}

/**
 * Canonical sheet names and their canonical columns from setup.gs
 */
const canonicalSheets = {
  "Take It Down Tracker": [
    "Domain",
    "URL",
    "Contact Email",
    "Contact Name",
    "Date Sent",
    "Current Status",
    "Deindexed by Google?",
    "Media Type",
    "Saved to Drive?",
    "Drive Link",
    "Download Status",
    "Notes"
  ],
  "Inbox": [
    "Domain",
    "URL",
    "Contact Email",
    "Date Added",
    "Notes"
  ],
  "Search Deindexing": [
    "Domain",
    "URL",
    "Date Requested",
    "Status",
    "Notes"
  ],
  "Triage": [
    "Domain",
    "URL",
    "Priority",
    "Notes"
  ]
};

/**
 * Rename legacy sheets and adjust their columns to canonical layouts
 */
function migrateSheetNamesAndLayouts() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetRenames = {
      "Tracker": "Take It Down Tracker",
      "Takedown Log": "Take It Down Tracker",
      "URL Dump Zone": "Inbox",
      "Google Deindexing": "Search Deindexing",
      "Discovery Queue": "Triage"
    };

    // Rename sheets if needed
    Object.entries(sheetRenames).forEach(([oldName, newName]) => {
      const oldSheet = ss.getSheetByName(oldName);
      const newSheet = ss.getSheetByName(newName);
      if (oldSheet && !newSheet) {
        oldSheet.setName(newName);
      }
    });

    // For each canonical sheet, ensure columns match canonical layout
    Object.entries(canonicalSheets).forEach(([sheetName, canonicalHeaders]) => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;

      // Get existing header row and data
      const lastRow = sheet.getLastRow();
      const lastCol = sheet.getLastColumn();
      const currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];

      // Build a map from header name to column index in existing sheet
      const headerIndexMap = {};
      currentHeaders.forEach((h, i) => {
        headerIndexMap[h] = i;
      });

      // Prepare new header row in canonical order
      sheet.getRange(1, 1, 1, canonicalHeaders.length).setValues([canonicalHeaders]);

      // If there is data, rearrange rows to match new column order
      if (lastRow > 1) {
        const numRows = lastRow - 1;
        const newData = [];

        for (let r = 0; r < numRows; r++) {
          const newRow = [];
          for (let h = 0; h < canonicalHeaders.length; h++) {
            const header = canonicalHeaders[h];
            if (header in headerIndexMap) {
              const colIndex = headerIndexMap[header];
              // Get value from old data at row r + 2 (since headers at row 1)
              const value = sheet.getRange(r + 2, colIndex + 1).getValue();
              newRow.push(value);
            } else {
              // New column, fill blank
              newRow.push('');
            }
          }
          newData.push(newRow);
        }
        // Write back new data aligned with canonical headers
        sheet.getRange(2, 1, numRows, canonicalHeaders.length).setValues(newData);

        // Clear any excess columns if canonical headers fewer than old headers
        if (lastCol > canonicalHeaders.length) {
          sheet.getRange(1, canonicalHeaders.length + 1, lastRow, lastCol - canonicalHeaders.length).clearContent();
        }
      }
    });
  } catch (e) {
    logError('migrateSheetNamesAndLayouts', '', e.message);
    SpreadsheetApp.getUi().alert('Error in migrateSheetNamesAndLayouts: ' + e.message);
  }
}

/**
 * Migrate 'Contact Email' to 'Contact Email' in the relevant sheets.
 */
function migrateColumnNames() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetsToCheck = ["Take It Down Tracker", "Inbox"];
    sheetsToCheck.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return;

      const { TRACKER_HEADERS, INBOX_HEADERS } = getGlobals();
      const header = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const dmcaIndex = header.indexOf("DMCA Contact");
      const contactEmailIndex = header.indexOf("Contact Email");

      if (dmcaIndex !== -1 && contactEmailIndex === -1) {
        // Rename header
        sheet.getRange(1, dmcaIndex + 1).setValue("Contact Email");
      } else if (dmcaIndex !== -1 && contactEmailIndex !== -1 && dmcaIndex !== contactEmailIndex) {
        // Copy old column data to new column, clear old
        const numRows = sheet.getLastRow() - 1;
        if (numRows > 0) {
          const data = sheet.getRange(2, dmcaIndex + 1, numRows).getValues();
          sheet.getRange(2, contactEmailIndex + 1, numRows).setValues(data);
          sheet.getRange(2, dmcaIndex + 1, numRows).clearContent();
        }
        // Rename header anyway
        sheet.getRange(1, dmcaIndex + 1).setValue("Contact Email");
      }
    });
  } catch (e) {
    logError('migrateColumnNames', '', e.message);
    SpreadsheetApp.getUi().alert('Error in migrateColumnNames: ' + e.message);
  }
}

/**
 * Migrate Domain Tag column to Domain if applicable.
 */
function migrateDomainTags() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const dumpSheet = ss.getSheetByName('Inbox');
    if (!dumpSheet) return;

    const { INBOX_HEADERS } = getGlobals();
    const header = dumpSheet.getRange(1, 1, 1, dumpSheet.getLastColumn()).getValues()[0];
    const domainTagIndex = header.indexOf('Domain Tag');
    const domainIndex = header.indexOf('Domain');

    if (domainTagIndex !== -1 && domainIndex !== -1 && domainTagIndex !== domainIndex) {
      const numRows = dumpSheet.getLastRow() - 1;
      if (numRows > 0) {
        const tagValues = dumpSheet.getRange(2, domainTagIndex + 1, numRows).getValues();
        const domainValues = dumpSheet.getRange(2, domainIndex + 1, numRows).getValues();
        for (let i = 0; i < numRows; i++) {
          if (tagValues[i][0]) {
            domainValues[i][0] = tagValues[i][0];
          }
        }
        dumpSheet.getRange(2, domainIndex + 1, numRows).setValues(domainValues);
      }
    }
  } catch (e) {
    logError('migrateDomainTags', '', e.message);
    SpreadsheetApp.getUi().alert('Error in migrateDomainTags: ' + e.message);
  }
}

/**
 * Populate missing Media Type column values.
 */
function migrateMediaType() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const mainSheet = ss.getSheetByName('Take It Down Tracker');
    if (!mainSheet) return;

    const { TRACKER_HEADERS } = getGlobals();
    const header = mainSheet.getRange(1, 1, 1, mainSheet.getLastColumn()).getValues()[0];
    const urlIndex = header.indexOf('URL');
    const mediaTypeIndex = header.indexOf('Media Type');

    if (urlIndex === -1 || mediaTypeIndex === -1) return;


  if (removedIndex !== -1 && statusIndex !== -1) {
    const numRows = mainSheet.getLastRow() - 1;
    if (numRows > 0) {
      const removedValues = mainSheet.getRange(2, removedIndex + 1, numRows).getValues();
      const statusValues = mainSheet.getRange(2, statusIndex + 1, numRows).getValues();

      let changed = false;
      for (let i = 0; i < numRows; i++) {
        if (removedValues[i][0] && !statusValues[i][0]) {
          statusValues[i][0] = removedValues[i][0];
          changed = true;
        }
      }
      if (changed) {
        mainSheet.getRange(2, statusIndex + 1, numRows).setValues(statusValues);
      }
    }
  }
}
