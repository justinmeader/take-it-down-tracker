// ui.gs

/**
 * Adds "Take It Down" custom menu on spreadsheet open, using MENU_SCHEMA.
 * Calls healSheetSchemas() to self-heal on open.
 * @param {GoogleAppsScript.Events.SheetsOnOpen} e
 */
function onOpen(e) {
  const { MENU_SCHEMA, healSheetSchemas } = getGlobals();
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('Take It Down');
  MENU_SCHEMA.forEach(item => menu.addItem(item.name, item.function));
  menu.addToUi();
  // Self-heal schemas every time spreadsheet is opened
  try {
    healSheetSchemas();
  } catch (err) {
    ui.alert("Error during schema healing:\n" + err.message);
  }
}

/**
 * Sets the active sheet to the Status sheet.
 */
function goToStatusSheet() {
  const { SHEET_STATUS, assert } = getGlobals();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const status = ss.getSheetByName(SHEET_STATUS);
  assert(status, 'Status sheet missing');
  ss.setActiveSheet(status);
}

/**
 * Shows a dialog for copying all URLs for a given domain from Tracker.
 */
function showCopyUrlsForDomainDialog() {
  try {
    const { SHEET_TRACKER, TRACKER_COL, assert } = getGlobals();
    const ui = SpreadsheetApp.getUi();
    const domain = ui.prompt('Enter domain to filter URLs:').getResponseText();
    if (!domain) return;

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tracker = ss.getSheetByName(SHEET_TRACKER);
    assert(tracker, 'Tracker sheet missing');
    const data = tracker.getDataRange().getValues().slice(1);
    const urls = data.filter(row => (row[TRACKER_COL.Domain] || '').toLowerCase() === domain.toLowerCase())
      .map(row => row[TRACKER_COL.URL])
      .join('\n');
    if (!urls) {
      ui.alert(`No URLs found for domain: ${domain}`);
      return;
    }
    ui.showModalDialog(
      HtmlService.createHtmlOutput(`<textarea style="width:100%;height:300px">${urls}</textarea>`).setWidth(500).setHeight(350),
      `URLs for ${domain}`
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error in showCopyUrlsForDomainDialog: ' + e.message);
  }
}

/**
 * Shows a help/about dialog.
 */
function showHelpMenu() {
  SpreadsheetApp.getUi().alert(
    'Take It Down Tracker\n\nBuilt for DMCA/Take It Down Act workflow, with modular Apps Script backend and Drive integration.\n\nFor help, see the README or contact your admin.'
  );
}

/**
 * Fetches the last N (default 20) ERROR-level log entries and displays them in a modal dialog.
 * @param {number} [n=20]
 */
function showRecentErrorsDialog(n) {
  n = n || 20;
  const { SHEET_LOGS, LOGS_HEADERS, assert } = getGlobals();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logs = ss.getSheetByName(SHEET_LOGS);
  assert(logs, 'Logs sheet missing');
  const data = logs.getDataRange().getValues();
  const errorRows = [];
  for (let i = data.length - 1; i >= 1 && errorRows.length < n; --i) {
    if ((data[i][3] || '').toUpperCase() === 'ERROR') errorRows.push(data[i]);
  }
  if (errorRows.length === 0) {
    SpreadsheetApp.getUi().alert("No recent error logs found!");
    return;
  }
  let html = "<h3>Recent Error Logs</h3><table border='1' style='border-collapse:collapse'>";
  html += "<tr><th>Timestamp</th><th>Operation</th><th>ID</th><th>Message</th></tr>";
  for (const row of errorRows) {
    html += `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td>${row[4]}</td></tr>`;
  }
  html += "</table>";
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(800).setHeight(400), "Recent Error Logs");
}

/**
 * Displays a batch job result in a modal dialog.
 * Used by batch jobs (import, download, hash, etc).
 * @param {string} title
 * @param {string} summary
 * @param {Array<string>} [details]
 */
function showBatchResultModal(title, summary, details) {
  let html = `<h3>${title}</h3><p>${summary}</p>`;
  if (details && details.length > 0) {
    html += "<ul style='max-height:200px;overflow:auto'>";
    details.slice(0, 10).forEach(msg => {
      html += `<li>${msg}</li>`;
    });
    if (details.length > 10) html += `<li>...and ${details.length - 10} more</li>`;
    html += "</ul>";
  }
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(500).setHeight(300), title);
}

/**
 * Menu wrapper for pruneLogs.
 */
function pruneLogsMenu() {
  try {
    pruneLogs();
    SpreadsheetApp.getUi().alert('Logs pruned.');
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error pruning logs: ' + e.message);
  }
}

/**
 * Prune the Archive sheet to the last 1000 entries.
 */
function pruneArchiveMenu() {
  try {
    const { SHEET_ARCHIVE, assert } = getGlobals();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const archive = ss.getSheetByName(SHEET_ARCHIVE);
    assert(archive, 'Archive sheet missing');
    const lastRow = archive.getLastRow();
    if (lastRow > 1001) {
      archive.deleteRows(2, lastRow - 1001);
      SpreadsheetApp.getUi().alert('Archive pruned.');
    } else {
      SpreadsheetApp.getUi().alert('Archive already within limits.');
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error pruning archive: ' + e.message);
  }
}
