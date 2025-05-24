// import.gs

/**
 * Moves all "Reviewed?" Inbox rows to Tracker, deduplicates, assigns IDs, infers domain/media.
 * Skips and warns on invalid rows (bad URL, media type, etc).
 * Aborts import if there are critical (non-skippable) errors.
 * Logs and shows results in modal, and logs to Change Log for each imported row.
 */
function importToTracker() {
  try {
  const {
    SHEET_INBOX, SHEET_TRACKER, INBOX_HEADERS, TRACKER_HEADERS, TRACKER_COL,
    assert, readConfig, getNextId
  } = getGlobals();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inbox = ss.getSheetByName(SHEET_INBOX);
  const tracker = ss.getSheetByName(SHEET_TRACKER);
  assert(inbox, 'Inbox sheet missing');
  assert(tracker, 'Tracker sheet missing');

  const inboxData = inbox.getDataRange().getValues();
  if (!inboxData || inboxData.length < 2) return; // nothing to do

  const hdrMap = Object.fromEntries(INBOX_HEADERS.map((h,i)=>[h,i]));
  const reviewedCol = hdrMap['Reviewed?'];
  const urlCol = hdrMap['URL'];
  const importedCol = hdrMap['Imported?'];
  const dmcaCol = hdrMap['Contact Email']; // renamed from 'Contact Email'
  const domainTagCol = hdrMap['Domain Tag'];

  let toImport = [];
  let markImported = [];
  let errors = [];
  let warnings = [];

  // For duplicate detection and change log
  let allUrls = [];
  let allIds = [];
  let changeLogEntries = [];

  // Get existing Tracker URLs as canonical set
  const trackerData = tracker.getDataRange().getValues();
  const trackerUrls = new Set((trackerData.length > 1)
    ? trackerData.slice(1).map(r=>URLUtils.canonicalizeUrl(r[TRACKER_COL.URL]))
    : []);

  // Validate each candidate row and build import list
  for (let i=1; i<inboxData.length; ++i) {
    const row = inboxData[i];
    const rowObj = {
      URL: (row[urlCol] || '').trim(),
      MediaType: '', // Will set after classify
      Domain: row[domainTagCol] || URLUtils.extractDomain(row[urlCol] || ''),
      ContactEmail: row[dmcaCol] || ''
    };

    if (row[reviewedCol] !== true && row[reviewedCol] !== "TRUE") { warnings.push(`Row ${i+1}: Not reviewed`); continue; }
    if (row[importedCol]) { warnings.push(`Row ${i+1}: Already imported`); continue; }

    // Validate URL
    const urlError = validateUrl(rowObj.URL);
    if (urlError) { errors.push(`Row ${i+1}: ${urlError}`); continue; }
    // Duplicate URL detection
    const canon = URLUtils.canonicalizeUrl(rowObj.URL);
    if (trackerUrls.has(canon)) { warnings.push(`Row ${i+1}: Duplicate URL (already in Tracker)`); continue; }
    allUrls.push(canon);

    // Classify and validate media type
    rowObj.MediaType = URLUtils.classifyMediaType(rowObj.URL);
    const mtError = validateMediaType(rowObj.MediaType);
    if (mtError) { errors.push(`Row ${i+1}: ${mtError}`); continue; }

    // Validate requireds (URL, Domain, MediaType)
    const reqMissing = validateRequiredFields(rowObj, ['URL', 'Domain', 'MediaType']);
    if (reqMissing.length) { errors.push(`Row ${i+1}: ${reqMissing.join('; ')}`); continue; }

    // Build Tracker row for import
    const id = getNextId();
    allIds.push(id);

    let trackerRow = Array(TRACKER_HEADERS.length).fill('');
    trackerRow[TRACKER_COL.ID] = id;
    trackerRow[TRACKER_COL.Domain] = rowObj.Domain;
    trackerRow[TRACKER_COL.URL] = rowObj.URL;
    trackerRow[TRACKER_COL.Contact_Email] = rowObj.ContactEmail; // renamed from Contact_Email
    trackerRow[TRACKER_COL.Media_Type] = rowObj.MediaType;

    toImport.push(trackerRow);
    markImported.push(i+1);
    trackerUrls.add(canon);

    // Prepare change log entry
    changeLogEntries.push({
      action: 'Import',
      trackerId: id,
      domain: rowObj.Domain,
      url: rowObj.URL,
      message: 'Imported from Inbox'
    });
  }

  // Post-validation: check for duplicate URLs or IDs in batch
  const batchDupes = Array.from(findDuplicates(allUrls));
  if (batchDupes.length) {
    errors.push(`Duplicate URLs within batch (will not import): ${batchDupes.join(', ')}`);
  }
  const idDupes = Array.from(findDuplicates(allIds));
  if (idDupes.length) {
    errors.push(`Duplicate IDs generated (unexpected!): ${idDupes.join(', ')}`);
  }

    // If any errors, abort import and show details
    if (errors.length) {
      showBatchResultModal(
        "Import Blocked: Validation Errors",
        `Errors detected, import aborted. Please fix these issues and retry.`,
        errors
      );
      logError('ImportToTracker', '', `Blocked: ${errors.length} validation errors`);
      return;
    }

    // --- Batch append to Tracker ---
    if (toImport.length) {
      tracker.getRange(tracker.getLastRow()+1, 1, toImport.length, toImport[0].length).setValues(toImport);
    }

    // --- Batch mark imported ---
    if (markImported.length) {
      const col = importedCol+1;
      const range = inbox.getRangeList(markImported.map(r=>`R${r}C${col}`));
      range.setValue("Imported");
    }

    // --- Logging and UI summary ---
    logInfo('ImportToTracker', '', `Imported ${toImport.length} new row(s). Warnings: ${warnings.length}`);
    if (changeLogEntries.length) {
      logBatchChange(changeLogEntries);
    }
    showBatchResultModal(
      "Import to Tracker Complete",
      `Imported ${toImport.length} new row(s) to Tracker.`,
      warnings
    );
  } catch (e) {
    logError('importToTracker', '', e.message);
    SpreadsheetApp.getUi().alert('Error in importToTracker: ' + e.message);
  }
}
