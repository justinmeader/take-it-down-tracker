// directory.gs

/**
 * Looks up the Abuse Contact for a given domain using the Directory sheet.
 * @param {string} domain - Domain name to look up.
 * @returns {string} Abuse Contact or empty string if not found.
 */
function lookupAbuseContact(domain) {
  const {
    SHEET_DIRECTORY, DIRECTORY_HEADERS, assert
  } = getGlobals();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dir = ss.getSheetByName(SHEET_DIRECTORY);
  assert(dir, 'Directory sheet missing');
  const data = dir.getDataRange().getValues();
  if (data.length < 2) return '';
  const hmap = Object.fromEntries(DIRECTORY_HEADERS.map((h, i) => [h, i]));
  for (let i = 1; i < data.length; ++i) {
    if ((data[i][hmap['Domain']] || '').toLowerCase() === domain.toLowerCase()) {
      return data[i][hmap['Abuse Contact']] || '';
    }
  }
  return '';
}

/**
 * Looks up the Registrar for a given domain using the Directory sheet.
 * @param {string} domain - Domain name to look up.
 * @returns {string} Registrar or empty string if not found.
 */
function lookupRegistrar(domain) {
  const {
    SHEET_DIRECTORY, DIRECTORY_HEADERS, assert
  } = getGlobals();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dir = ss.getSheetByName(SHEET_DIRECTORY);
  assert(dir, 'Directory sheet missing');
  const data = dir.getDataRange().getValues();
  if (data.length < 2) return '';
  const hmap = Object.fromEntries(DIRECTORY_HEADERS.map((h, i) => [h, i]));
  for (let i = 1; i < data.length; ++i) {
    if ((data[i][hmap['Domain']] || '').toLowerCase() === domain.toLowerCase()) {
      return data[i][hmap['Registrar']] || '';
    }
  }
  return '';
}
