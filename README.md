# Take It Down Tracker (NCSEI)

## Overview
This project is an internal tracker for takedown work related to abuse, doxxing, extortion, and similar issues. It is built on Google Apps Script and interacts with Google Sheets, Gmail, and Drive.

## Centralized Header Configuration
All sheet names and column headers are defined in `config.gs` as constants. This centralization ensures:
- Consistent schema usage across all modules
- Easy updates when adding/removing columns
- Reduced risk of hardcoded, inconsistent references

### How to Add or Update Columns
1. **Edit the relevant header array** in `config.gs` (e.g., `TRACKER_HEADERS`, `INBOX_HEADERS`, etc.).
2. **Update any sheet templates** to match the new schema.
3. **Review dependent code** (imports, migrations, logging) to ensure new columns are handled.

### Header Arrays in `config.gs`
- `INBOX_HEADERS`: Inbox sheet columns
- `TRACKER_HEADERS`: Main tracker columns
- `ARCHIVE_HEADERS`: Archive of completed takedowns
- `DIRECTORY_HEADERS`: Registrar/domain contact info
- `STATUS_HEADERS`: Status metadata for dropdowns
- `LOGS_HEADERS`: Structured logging columns
- `SETTINGS_HEADERS`: Project settings
- `SEARCH_DEINDEX_HEADERS`: Search engine removal tracking
- `TRIAGE_HEADERS`: Triage/review sheet columns
- `CHANGE_LOG_HEADERS`: Change log/audit columns

## Developer Onboarding
- **All header usage is centralized.** Never hardcode column names in other files—always reference the constants via `getGlobals()`.
- **When adding features:** Always check if you need to update/add a header array in `config.gs`.
- **When debugging:** Use the test harness (see below) to validate sheet schemas before/after migrations.

## Test Harness & Migration Validation
- The `testrunner.gs` file provides a `testRunner()` function.
- **Usage:** Run `testRunner()` from the Apps Script editor. It logs all sheet names and headers before and after running migrations.
- **Check logs:** Go to `View > Logs` in the Apps Script editor to see the output.

## Error Handling & Logging
- All external API calls (Sheets, Gmail, Drive) are wrapped in `try/catch` blocks for robust error handling.
- Errors are logged to the Logs sheet using the centralized `logError` function.

## Automated Testing & Linting
- Example test functions are provided for key workflows (import, migration, etc.).
- Use these as a template to add further tests as the project evolves.
- Linting is recommended using [ESLint](https://eslint.org/) (see below).

### Setting Up ESLint (Recommended)
1. Install [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/).
2. In your project directory, run:
   ```
   npm install eslint --save-dev
   npx eslint --init
   ```
3. Configure rules as desired (recommended: Airbnb or Google style guide).
4. Run `npx eslint .` to check for issues.

## Contributing
- Always update header arrays in `config.gs` first.
- Add or update tests in `testrunner.gs` as needed.
- Document any schema or workflow changes in this README.

---
For questions or issues, contact the project maintainer.
