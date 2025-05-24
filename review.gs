// review.gs

/**
 * Moves all Tracker rows with "Removed" status to Archive.
 * Updates status heartbeat, logs action, and shows batch result modal.
 * Logs to Change Log for each archived row.
 */
function archiveRemovedRows() {
  try {
  const {
    SHEET_TRACKER, SHEET_ARCHIVE, TRACKER_COL, STATUS_REMOVED, STATUS_HEADERS, assert, updateStatusMessage
  } = getGlobals();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tracker = ss.getSheetByName(SHEET_TRACKER);
  const archive = ss.getSheetByName(SHEET_ARCHIVE);
  assert(tracker, 'Tracker sheet missing');
  assert(archive, 'Archive sheet missing');

  const data = tracker.getDataRange().getValues();
  let archived = 0;
  let reasons = [];
  let changeLogEntries = [];
  for (let i = data.length - 1; i >= 1; --i) {
    if (data[i][TRACKER_COL.Current_Status] === STATUS_REMOVED) {
      archive.appendRow(data[i]);
      tracker.deleteRow(i + 1);
      archived++;
      reasons.push(`Row ${i+1}: Archived`);
      // Add to Change Log
      changeLogEntries.push({
        action: 'Archive',
        trackerId: data[i][TRACKER_COL.ID],
        domain: data[i][TRACKER_COL.Domain],
        url: data[i][TRACKER_COL.URL],
        message: 'Archived after removal'
      });
    }
  }
  updateStatusMessage(STATUS_HEADERS[3], `Archived: ${archived} removed row(s)`);
  logInfo('ArchiveRemovedRows', '', `Archived: ${archived} removed row(s)`);
  if (changeLogEntries.length) {
    logBatchChange(changeLogEntries);
  }
  showBatchResultModal(
    "Archive Removed Rows Complete",
    `Archived: ${archived} removed row(s) from Tracker.`,
    reasons
  );
}
