// utils.gs

/**
 * Namespace for canonical URL/domain helpers.
 * All modules should use these for consistency.
 */
var URLUtils = {

  /**
   * Canonicalizes a URL for de-duplication and comparison.
   * Strips fragments, trims, lowercases protocol/domain, removes trailing slash, etc.
   * @param {string} url
   * @returns {string} Canonicalized URL or original if parse fails.
   */
  canonicalizeUrl: function(url) {
    if (!url || typeof url !== 'string') return '';
    try {
      let u = url.trim();
      u = decodeURIComponent(u);
      let frag = u.indexOf('#');
      if (frag > -1) u = u.slice(0, frag);
      let m = u.match(/^(https?:\/\/)([^\/]+)(\/?.*)$/i);
      if (m) {
        let scheme = m[1].toLowerCase();
        let host = m[2].toLowerCase();
        let path = m[3].replace(/\/$/, '');
        u = scheme + host + path;
      }
      return u;
    } catch(e) {
      return url;
    }
  },

  /**
   * Extracts domain from URL (no protocol, just host).
   * @param {string} url
   * @returns {string} Domain part, or original string if parsing fails.
   */
  extractDomain: function(url) {
    try {
      let u = url.trim();
      if (u.startsWith('http')) {
        let m = u.match(/^https?:\/\/([^\/?#]+)/i);
        if (m) return m[1].toLowerCase();
      }
      return u.toLowerCase();
    } catch(e) {
      return url;
    }
  },

  /**
   * Classifies media type (image, video, page) based on extension.
   * @param {string} url
   * @returns {'Image'|'Video'|'Page'}
   */
  classifyMediaType: function(url) {
    if (!url) return 'Page';
    const img = /\.(jpe?g|png|gif|webp|bmp|svg|tiff?)$/i;
    const vid = /\.(mp4|webm|avi|mov|mkv|flv|wmv|mpg|mpeg)$/i;
    if (img.test(url)) return 'Image';
    if (vid.test(url)) return 'Video';
    return 'Page';
  },

  /**
   * Gets file extension from URL or filename.
   * @param {string} url
   * @returns {string} Lowercase extension or empty string.
   */
  getExtension: function(url) {
    if (!url) return '';
    let ext = url.split(/[?#]/)[0].split('.').pop();
    if (ext && ext.length <= 5) return ext.toLowerCase();
    return '';
  }
};

/**
 * Namespace for standardized sheet helpers.
 */
var SheetUtils = {

  /**
   * Ensures a sheet exists, creates if missing, and returns it.
   * @param {string} name - Sheet name.
   * @returns {GoogleAppsScript.Spreadsheet.Sheet}
   */
  ensureSheet: function(name) {
    try {
      let ss = SpreadsheetApp.getActiveSpreadsheet();
      let s = ss.getSheetByName(name);
      if (!s) s = ss.insertSheet(name);
      return s;
    } catch (e) {
      logError('SheetUtils.ensureSheet', name, e.message);
      SpreadsheetApp.getUi().alert('Error ensuring sheet: ' + e.message);
      return null;
    }
  },

  /**
   * Clears a sheet and writes headers.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {string[]} headers
   */
  clearAndHeader: function(sheet, headers) {
    try {
      sheet.clear();
      sheet.appendRow(headers);
    } catch (e) {
      logError('SheetUtils.clearAndHeader', '', e.message);
      SpreadsheetApp.getUi().alert('Error clearing sheet or setting headers: ' + e.message);
    }
  },

  /**
   * Sets column widths for all columns.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {number[]} widths - Width in pixels for each column.
   */
  setColumnWidths: function(sheet, widths) {
    try {
      for (let i=0; i<widths.length; ++i) {
        sheet.setColumnWidth(i+1, widths[i]);
      }
    } catch (e) {
      logError('SheetUtils.setColumnWidths', '', e.message);
      SpreadsheetApp.getUi().alert('Error setting column widths: ' + e.message);
    }
  },

  /**
   * Protects a header row from edits.
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {number} headerRow
   */
  protectRange: function(sheet, headerRow) {
    try {
      let r = sheet.getRange(headerRow, 1, 1, sheet.getLastColumn());
      let p = r.protect();
      p.setDescription("Header Row");
      p.removeEditors(p.getEditors());
    } catch (e) {
      logError('SheetUtils.protectRange', '', e.message);
      SpreadsheetApp.getUi().alert('Error protecting header row: ' + e.message);
    }
  },

  /**
   * Adds dropdown data validation to a column (for all rows except header).
   * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
   * @param {number} col - Zero-based index.
   * @param {string[]} options
   */
  addDropdown: function(sheet, col, options) {
    try {
      let range = sheet.getRange(2, col+1, sheet.getMaxRows()-1);
      let rule = SpreadsheetApp.newDataValidation()
        .requireValueInList(options, true)
        .setAllowInvalid(false)
        .build();
      range.setDataValidation(rule);
    } catch (e) {
      logError('SheetUtils.addDropdown', '', e.message);
      SpreadsheetApp.getUi().alert('Error adding dropdown: ' + e.message);
    }
  }
};

/**
 * Validates a single URL.
 * Returns empty string if valid, or an error reason.
 * @param {string} url
 * @returns {string}
 */
function validateUrl(url) {
  if (!url || typeof url !== 'string') return "URL blank or missing";
  if (!/^https?:\/\//i.test(url.trim())) return "URL must start with http:// or https://";
  return "";
}

/**
 * Validates a media type.
 * @param {string} mediaType
 * @returns {string}
 */
function validateMediaType(mediaType) {
  if (!mediaType) return "Media Type blank";
  const valid = ['Image', 'Video', 'Page'];
  if (!valid.includes(mediaType)) return `Invalid Media Type: ${mediaType}`;
  return "";
}

/**
 * Validates that required columns are present and not blank.
 * @param {Object} rowObj
 * @param {string[]} requiredFields
 * @returns {Array<string>} - Array of error strings
 */
function validateRequiredFields(rowObj, requiredFields) {
  return requiredFields
    .filter(f => !rowObj[f] || String(rowObj[f]).trim() === "")
    .map(f => `Missing required: ${f}`);
}

/**
 * Checks for duplicate values in an array.
 * Returns a Set of all duplicate values.
 * @param {Array<string>} arr
 * @returns {Set<string>}
 */
function findDuplicates(arr) {
  const seen = new Set();
  const dupes = new Set();
  for (const v of arr) {
    if (seen.has(v)) dupes.add(v);
    else seen.add(v);
  }
  return dupes;
}
