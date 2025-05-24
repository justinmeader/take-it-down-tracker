// hash.gs

/**
 * Computes SHA-256 (or MD5 fallback) for each eligible Drive file in Tracker, records in Hash column.
 * Skips files > 25MB for performance and quota safety.
 * Logs the result and shows a batch result modal.
 */
function bulkHashExistingDownloads() {
  try {
    const {
      SHEET_TRACKER, TRACKER_COL, assert, readConfig
    } = getGlobals();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const tracker = ss.getSheetByName(SHEET_TRACKER);
    assert(tracker, 'Tracker sheet missing');
    const data = tracker.getDataRange().getValues();
    if (!data || data.length < 2) return;

  const DRIVE_LINK_COL = TRACKER_COL.Drive_Link;
  const HASH_COL = TRACKER_COL.Hash;
  const STATUS_COL = TRACKER_COL.Download_Status;

  /** @constant {number} Maximum file size (bytes) to hash */
  const SIZE_LIMIT = 25 * 1024 * 1024; // 25 MB max

  let hashed = 0, skipped = 0, errors = 0;
  let reasons = [];

  // Extracts a Drive file ID from a URL.
  // @param {string} link
  // @returns {string|null}
  function extractFileId(link) {
    const match = link.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  }

  for (let i=1; i<data.length; ++i) {
    const row = data[i];
    const driveLink = row[DRIVE_LINK_COL];
    if (!driveLink) { skipped++; continue; }

    // Only hash if not already hashed
    if (row[HASH_COL]) { skipped++; continue; }

    try {
      // Get file by ID
      const fileId = extractFileId(driveLink);
      if (!fileId) throw new Error('No valid fileId in Drive link');
      const file = DriveApp.getFileById(fileId);

      if (file.getSize() > SIZE_LIMIT) {
        tracker.getRange(i+1, HASH_COL+1).setValue('[Too large]');
        skipped++; reasons.push(`Row ${i+1}: >25MB`);
        continue;
      }

      const blob = file.getBlob();
      let hashVal = '';
      try {
        hashVal = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, blob.getBytes())
          .map(b=>b.toString(16).padStart(2,'0')).join('');
      } catch(e) {
        // fallback to MD5
        hashVal = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, blob.getBytes())
          .map(b=>b.toString(16).padStart(2,'0')).join('');
      }
      tracker.getRange(i+1, HASH_COL+1).setValue(hashVal);
      hashed++;
    } catch(e) {
      tracker.getRange(i+1, HASH_COL+1).setValue('[Error]');
      tracker.getRange(i+1, STATUS_COL+1).setValue(`Hash Fail: ${e.message}`);
      errors++; reasons.push(`Row ${i+1}: ${e.message}`);
    }
  }

  logInfo('BulkHash', '', `Hashed: ${hashed}, Skipped: ${skipped}, Errors: ${errors}`);
  showBatchResultModal(
    "Hash Existing Downloads Complete",
    `Hashed: ${hashed}, Skipped: ${skipped}, Errors: ${errors}`,
    reasons
  );
}
