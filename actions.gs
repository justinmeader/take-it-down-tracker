// actions.gs
// Core workflow and custom menu actions for Take It Down Act Tracker v2.
// Updated to replace 'DMCA Contact' with 'Contact Email' and update menu labels.

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Take It Down Act Tracker')
    .addItem('Send Emails', 'sendEmails')
    .addItem('Edit Email Template', 'editEmailTemplate')
    .addToUi();
}

// Allows manual trigger of the download process
function manualDownloadTrigger() {
  try {
    downloadNextBatch();
  } catch (e) {
    logError('manualDownloadTrigger', '', e.message);
    SpreadsheetApp.getUi().alert('Error triggering manual download: ' + e.message);
  }
}

// Clears the Download Status column for all rows
function clearDownloadStatus() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Take It Down Tracker');
    if (!sheet) return;
    var data = sheet.getDataRange().getValues();
    const { TRACKER_HEADERS } = getGlobals();
    var statusCol = data[0].indexOf(TRACKER_HEADERS[TRACKER_HEADERS.indexOf('Download Status')]);
    if (statusCol === -1) return;
    for (var i = 1; i < data.length; i++) {
      sheet.getRange(i + 1, statusCol + 1).setValue('');
    }
  } catch (e) {
    logError('clearDownloadStatus', '', e.message);
    SpreadsheetApp.getUi().alert('Error clearing download status: ' + e.message);
  }
}

function editEmailTemplate() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Email Template');
    if (sheet) {
      ss.setActiveSheet(sheet);
      SpreadsheetApp.getUi().alert('You can now edit the email subject and body.');
    } else {
      SpreadsheetApp.getUi().alert('Email Template sheet not found!');
    }
  } catch (e) {
    logError('editEmailTemplate', '', e.message);
    SpreadsheetApp.getUi().alert('Error editing email template: ' + e.message);
  }
}

function sendEmails() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var logSheet = ss.getSheetByName('Take It Down Tracker');
    if (!logSheet) {
      SpreadsheetApp.getUi().alert('Take It Down Tracker sheet not found!');
      return;
    }
    var logData = logSheet.getDataRange().getValues();
    const { TRACKER_HEADERS } = getGlobals();
    var header = logData[0];
    var emailCol = header.indexOf('Contact Email');
    var dateSentCol = header.indexOf('Date Sent');
    var statusCol = header.indexOf('Current Status');
    var nameCol = header.indexOf('Contact Name');
    var domainCol = header.indexOf('Domain');
    var urlCol = header.indexOf('URL');
    if (emailCol === -1) {
      SpreadsheetApp.getUi().alert('Contact Email column not found!');
      return;
    }

    var rowsToEmail = [];
    for (var i = 1; i < logData.length; i++) {
      if (logData[i][emailCol] && !logData[i][dateSentCol]) {
        rowsToEmail.push({row: i + 1, data: logData[i]});
      }
    }
    if (rowsToEmail.length === 0) {
      SpreadsheetApp.getUi().alert('No eligible takedown requests found (must have Contact Email and no Date Sent).');
      return;
    }

    var senderEmail = Session.getActiveUser().getEmail();

    var ui = SpreadsheetApp.getUi();
    var response = ui.alert(
      'Ready to send ' + rowsToEmail.length + ' takedown emails from: ' + senderEmail + '.\n\nProceed?',
      ui.ButtonSet.YES_NO
    );
    if (response !== ui.Button.YES) return;

    var templateSheet = ss.getSheetByName('Email Template');
    if (!templateSheet) {
      SpreadsheetApp.getUi().alert('Email Template sheet not found!');
      return;
    }
    var subject = templateSheet.getRange('B2').getValue();
    var body = templateSheet.getRange('B3').getValue();

    for (var r = 0; r < rowsToEmail.length; r++) {
      try {
        var contactEmail = rowsToEmail[r].data[emailCol];
        var contactName = rowsToEmail[r].data[nameCol] || "To Whom It May Concern";
        var domain = rowsToEmail[r].data[domainCol];
        var url = rowsToEmail[r].data[urlCol];

        var finalBody = body
          .replace(/\[Contact Name\]/g, contactName)
          .replace(/\[Domain\]/g, domain)
          .replace(/\[URL\]/g, url);

        GmailApp.sendEmail(contactEmail, subject, '', {
          htmlBody: finalBody,
          name: senderEmail
        });
        logSheet.getRange(rowsToEmail[r].row, dateSentCol + 1).setValue(new Date());
        logSheet.getRange(rowsToEmail[r].row, statusCol + 1).setValue('Sent');
      } catch (emailErr) {
        logError('sendEmails', '', 'Failed to send to ' + (rowsToEmail[r].data[emailCol] || '[unknown]') + ': ' + emailErr.message);
        SpreadsheetApp.getUi().alert('Error sending email to ' + (rowsToEmail[r].data[emailCol] || '[unknown]') + ': ' + emailErr.message);
      }
    }
    SpreadsheetApp.getUi().alert('All emails sent.');
  } catch (e) {
    logError('sendEmails', '', e.message);
    SpreadsheetApp.getUi().alert('Error in sendEmails: ' + e.message);
  }
}
