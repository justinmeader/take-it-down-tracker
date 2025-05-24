// status.gs

/**
 * Audits deadlines: flips "Notice Sent" to "Deadline Exceeded" if >48h has elapsed since Date Sent.
 * Optionally emails summary (not yet implemented).
 * Logs and shows a result modal.
 */
function auditDeadlines() {
  try {
    const {
      SHEET_TRACKER, TRACKER_COL, STATUS_SENT, STATUS_DEADLINE, STATUS_HEADERS, assert, updateStatusMessage
    } = getGlobals();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tracker = ss.getSheetByName(SHEET_TRACKER);
    assert(tracker, 'Tracker sheet missing');

    const data = tracker.getDataRange().getValues();
    let updated = 0;
    let reasons = [];
    for (let i=1; i<data.length; ++i) {
      const row = data[i];
      if (row[TRACKER_COL.Current_Status] !== STATUS_SENT) continue;
      const sent = row[TRACKER_COL.Date_Sent];
      if (!sent) continue;
      const sentDate = (sent instanceof Date) ? sent : new Date(sent);
      if (isNaN(sentDate.getTime())) continue;
      if ((Date.now() - sentDate.getTime()) > 48*3600*1000) {
        tracker.getRange(i+1, TRACKER_COL.Current_Status+1).setValue(STATUS_DEADLINE);
        updated++;
        reasons.push(`Row ${i+1}: Deadline Exceeded`);
      }
    }
    updateStatusMessage(STATUS_HEADERS[2], `Audit: ${updated} deadline(s) exceeded.`);
    logInfo('AuditDeadlines', '', `Audit: ${updated} deadline(s) exceeded.`);
    showBatchResultModal(
      "Audit Deadlines Complete",
      `Deadlines exceeded: ${updated}`,
      reasons
    );
  } catch (e) {
    logError('auditDeadlines', '', e.message);
    SpreadsheetApp.getUi().alert('Error in auditDeadlines: ' + e.message);
  }
}

/**
 * Schedules daily auditDeadlines trigger at 9:00 AM, if not already scheduled.
 */
function scheduleAuditDeadlines() {
  try {
    cancelAuditDeadlinesSchedule(); // Remove any existing first
    ScriptApp.newTrigger('auditDeadlines')
      .timeBased()
      .atHour(9)
      .everyDays(1)
      .create();
    SpreadsheetApp.getUi().alert('Deadline audit scheduled for 9:00 AM daily.');
  } catch (e) {
    logError('scheduleAuditDeadlines', '', e.message);
    SpreadsheetApp.getUi().alert('Error scheduling deadline audit: ' + e.message);
  }
}

/**
 * Cancels all auditDeadlines triggers.
 */
function cancelAuditDeadlinesSchedule() {
  try {
    const triggers = ScriptApp.getProjectTriggers();
    let removed = 0;
    for (let t of triggers) {
      if (t.getHandlerFunction() === 'auditDeadlines') {
        ScriptApp.deleteTrigger(t); removed++;
      }
    }
    if (removed)
      SpreadsheetApp.getUi().alert('Deadline audit trigger(s) removed.');
  } catch (e) {
    logError('cancelAuditDeadlinesSchedule', '', e.message);
    SpreadsheetApp.getUi().alert('Error cancelling audit deadlines schedule: ' + e.message);
  }
}
