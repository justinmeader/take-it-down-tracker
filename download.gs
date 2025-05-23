// download.gs

/**
 * Downloads up to Batch_Size eligible media from Tracker to Drive.
 * Only increments batch counter for actual attempted downloads.
 * Skips non-image/video media, already-downloaded, or rows marked as 'Removed'.
 * Logs the result and shows a batch result modal.
 */
function downloadMediaToDrive() {
  const {
    SHEET_TRACKER, TRACKER_COL, STATUS_REMOVED, SETTING_BATCH_SIZE, SETTING_DOWNLOAD_ROOT,
    STATUS_HEADERS, assert, readConfig, updateStatusMessage
  } = getGlobals();

  const cfg = readConfig();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const tracker = ss.getSheetByName(SHEET_TRACKER);
  assert(tracker, 'Tracker sheet missing');
  const data = tracker.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const rootName = cfg[SETTING_DOWNLOAD_ROOT];
  const batchMax = cfg[SETTING_BATCH_SIZE];

  /** @type {GoogleAppsScript.Drive.Folder|null} */
  let rootFolder = null;
  /** @type {Object.<string, GoogleAppsScript.Drive.Folder>} */
  let domainFolders = {};

  /**
   * Gets or creates the root folder (cached).
   * @returns {GoogleAppsScript.Drive.Folder}
   */
  function getRootFolder() {
    if (!rootFolder) {
      let q = DriveApp.getFoldersByName(rootName);
      rootFolder = q.hasNext() ? q.next() : DriveApp.createFolder(rootName);
    }
    return rootFolder;
  }
  /**
   * Gets or creates a subfolder for a given domain (cached).
   * @param {string} domain
   * @returns {GoogleAppsScript.Drive.Folder}
   */
  function getDomainFolder(domain) {
    if (!domainFolders[domain]) {
      let root = getRootFolder();
      let f = root.getFoldersByName(domain);
      domainFolders[domain] = f.hasNext() ? f.next() : root.createFolder(domain);
    }
    return domainFolders[domain];
  }

  let processed = 0, saved = 0, skipped = 0, failed = 0;
  let reasons = [];
  let urlSet = new Set();

  // Build set of already-downloaded URLs (by reading Drive Link column)
  for (let i=0; i<rows.length; ++i) {
    const driveLink = rows[i][TRACKER_COL.Drive_Link];
    if (driveLink) urlSet.add(driveLink);
  }

  for (let i=0; i<rows.length; ++i) {
    const row = rows[i];
    const status = row[TRACKER_COL.Current_Status];
    const mediaType = row[TRACKER_COL.Media_Type];
    const url = row[TRACKER_COL.URL];
    const driveLink = row[TRACKER_COL.Drive_Link];

    // Skip already removed, or not image/video, or already downloaded
    if (status === STATUS_REMOVED) { skipped++; reasons.push(`Row ${i+2}: Removed`); continue; }
    if (!url || !['Image','Video'].includes(mediaType)) { skipped++; reasons.push(`Row ${i+2}: Not image/video`); continue; }
    if (driveLink) { skipped++; reasons.push(`Row ${i+2}: Already downloaded`); continue; }

    if (processed >= batchMax) break; // Don't process more than batchMax

    try {
      const domain = URLUtils.extractDomain(url);
      const ext = URLUtils.getExtension(url) || 'bin';

      // Fetch media (fetch with timeout/headers as needed)
      const resp = UrlFetchApp.fetch(url, {muteHttpExceptions:true, followRedirects:true, validateHttpsCertificates:true, timeout:60});
      if (resp.getResponseCode() !== 200) throw new Error(`HTTP ${resp.getResponseCode()}`);

      // Save to Drive
      const fileName = `media_${Date.now()}_${Math.floor(Math.random()*1e6)}.${ext}`;
      const blob = resp.getBlob().setName(fileName);
      const folder = getDomainFolder(domain);
      const file = folder.createFile(blob);
      const fileUrl = file.getUrl();

      // Write Drive Link back to sheet (plus Download Status)
      tracker.getRange(i+2, TRACKER_COL.Drive_Link+1).setValue(fileUrl);
      tracker.getRange(i+2, TRACKER_COL.Download_Status+1).setValue("Downloaded");
      saved++;
    } catch(e) {
      tracker.getRange(i+2, TRACKER_COL.Download_Status+1).setValue(`Failed: ${e.message}`);
      failed++; reasons.push(`Row ${i+2}: Error: ${e.message}`);
    }
    processed++; // Only increment for attempted downloads
  }

  updateStatusMessage(STATUS_HEADERS[1], `Downloaded: ${saved}, Failed: ${failed}, Skipped: ${skipped}`);
  logInfo('DownloadMediaToDrive', '', `Saved: ${saved}, Failed: ${failed}, Skipped: ${skipped}`);

  showBatchResultModal(
    "Media Download Complete",
    `Saved: ${saved}, Failed: ${failed}, Skipped: ${skipped}`,
    reasons
  );
}

/**
 * Starts a time-based scheduled trigger for media downloads.
 * Reads interval (minutes) from Settings.
 */
function startScheduledDownload() {
  stopScheduledDownload(); // idempotent: remove any existing
  const {SETTING_DOWNLOAD_INTERVAL, readConfig} = getGlobals();
  const cfg = readConfig();
  ScriptApp.newTrigger('downloadMediaToDrive')
    .timeBased()
    .everyMinutes(cfg[SETTING_DOWNLOAD_INTERVAL])
    .create();
  SpreadsheetApp.getUi().alert('Scheduled download trigger created.');
}

/**
 * Stops all scheduled download triggers.
 */
function stopScheduledDownload() {
  const triggers = ScriptApp.getProjectTriggers();
  let removed = 0;
  for (let t of triggers) {
    if (t.getHandlerFunction() === 'downloadMediaToDrive') {
      ScriptApp.deleteTrigger(t); removed++;
    }
  }
  if (removed)
    SpreadsheetApp.getUi().alert('Scheduled download trigger(s) removed.');
}
