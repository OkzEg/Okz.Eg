function doPost(e) {
  var result = { ok: false };
  try {
    var data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected =
      PropertiesService.getScriptProperties().getProperty('MAIL_SECRET') || '';
    if (!data.secret || !expected || data.secret !== expected) {
      result.error = 'unauthorized';
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
        ContentService.MimeType.JSON
      );
    }
    if (!data.to || !data.subject) {
      result.error = 'missing to/subject';
      return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
        ContentService.MimeType.JSON
      );
    }
    MailApp.sendEmail({
      to: String(data.to),
      bcc: data.bcc ? String(data.bcc) : undefined,
      subject: String(data.subject),
      htmlBody: data.html ? String(data.html) : undefined,
      body: data.text ? String(data.text) : ' ',
      name: data.fromName ? String(data.fromName) : 'OKZ',
      replyTo: data.replyTo ? String(data.replyTo) : Session.getActiveUser().getEmail(),
    });
    result.ok = true;
  } catch (err) {
    result.error = String(err);
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}
