const { buildOrderConfirmationHtml, formatMoney } = require('./orderEmailTemplate');

let nodemailer;
let cachedTransport;
let cachedAttemptLabel;
let lastProbe = {
  checkedAt: null,
  verified: null,
  error: null,
  via: null,
};
let lastSend = {
  at: null,
  to: null,
  sent: null,
  error: null,
  via: null,
};

const SMTP_CONNECT_MS = Number(process.env.SMTP_CONNECT_TIMEOUT_MS || 12000);
const SMTP_SOCKET_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 20000);
const SMTP_SEND_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS || 25000);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanEnv = (key, fallback = '') => {
  const raw = process.env[key];
  if (raw == null) return fallback;
  return String(raw)
    .trim()
    .replace(/^['"]+|['"]+$/g, '');
};

const maskEmail = (value) => {
  const email = String(value || '').trim();
  if (!email.includes('@')) return email ? 'set' : null;
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
};

const loadNodemailer = () => {
  if (nodemailer) return nodemailer;
  try {
    nodemailer = require('nodemailer');
    return nodemailer;
  } catch (error) {
    console.error('[mail] nodemailer is not installed:', error.message);
    return null;
  }
};

const smtpUser = () => cleanEnv('SMTP_USER');
const smtpPass = () => cleanEnv('SMTP_PASS').replace(/\s+/g, '');
const smtpHost = () => cleanEnv('SMTP_HOST', 'smtp.gmail.com') || 'smtp.gmail.com';

const isMailConfigured = () => Boolean(smtpUser() && smtpPass());

const isGmail = () => {
  const host = smtpHost();
  const user = smtpUser();
  return /gmail\.com$/i.test(host) || /@(gmail|googlemail)\.com$/i.test(user);
};

const formatSmtpError = (error) =>
  [error?.message, error?.code, error?.command, error?.response].filter(Boolean).join(' | ');

const destroyTransporter = (transport = cachedTransport) => {
  if (transport) {
    try {
      transport.close();
    } catch {
      /* ignore */
    }
  }
  if (transport === cachedTransport) {
    cachedTransport = null;
    cachedAttemptLabel = null;
  }
};

const withTimeout = (promise, ms, label) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

const connectionAttempts = () => {
  if (isGmail()) {
    return [
      { kind: 'service', label: 'gmail-service' },
      { port: 465, secure: true, family: 0, label: 'gmail:465/ssl' },
      { port: 465, secure: true, family: 4, label: 'gmail:465/ssl/ipv4' },
      { port: 587, secure: false, family: 0, label: 'gmail:587/starttls' },
      { port: 587, secure: false, family: 4, label: 'gmail:587/starttls/ipv4' },
    ];
  }

  const port = Number(cleanEnv('SMTP_PORT', '587')) || 587;
  const secure = cleanEnv('SMTP_SECURE').toLowerCase() === 'true' || port === 465;
  return [
    { port, secure, family: 0, label: `custom:${port}/${secure ? 'ssl' : 'starttls'}` },
    { port, secure, family: 4, label: `custom:${port}/${secure ? 'ssl' : 'starttls'}/ipv4` },
  ];
};

const createTransportForAttempt = (nm, attempt) => {
  const user = smtpUser();
  const pass = smtpPass();
  if (attempt.kind === 'service') {
    return nm.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: SMTP_CONNECT_MS,
      greetingTimeout: SMTP_CONNECT_MS,
      socketTimeout: SMTP_SOCKET_MS,
    });
  }

  const host = smtpHost();
  const options = {
    host,
    port: attempt.port,
    secure: attempt.secure,
    auth: { user, pass },
    connectionTimeout: SMTP_CONNECT_MS,
    greetingTimeout: SMTP_CONNECT_MS,
    socketTimeout: SMTP_SOCKET_MS,
    tls: { minVersion: 'TLSv1.2', servername: host },
  };
  if (attempt.family) options.family = attempt.family;
  if (!attempt.secure) options.requireTLS = true;
  return nm.createTransport(options);
};

const sendViaTransport = async (transport, mail) =>
  withTimeout(transport.sendMail(mail), SMTP_SEND_MS, 'SMTP sendMail');

const webhookUrl = () => cleanEnv('MAIL_WEBHOOK_URL');
const resendKey = () => cleanEnv('RESEND_API_KEY');
const hasHttpRelay = () => Boolean(webhookUrl() || resendKey());

const sendViaWebhook = async (mail) => {
  const url = webhookUrl();
  if (!url) return null;
  const response = await withTimeout(
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret: cleanEnv('MAIL_WEBHOOK_SECRET'),
        to: mail.to,
        bcc: mail.bcc || '',
        subject: mail.subject,
        html: mail.html || '',
        text: mail.text || '',
        fromName: cleanEnv('MAIL_FROM_NAME', 'OKZ') || 'OKZ',
        replyTo: mail.replyTo,
      }),
      redirect: 'follow',
    }),
    20000,
    'mail webhook'
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`webhook ${response.status}: ${body.slice(0, 240)}`);
  }
  return { messageId: 'webhook', via: 'gmail-apps-script' };
};

const sendViaResend = async (mail) => {
  const key = resendKey();
  if (!key) return null;
  const fromEmail = cleanEnv('RESEND_FROM', smtpUser());
  const response = await withTimeout(
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${cleanEnv('MAIL_FROM_NAME', 'OKZ') || 'OKZ'} <${fromEmail}>`,
        to: [mail.to],
        bcc: mail.bcc ? [mail.bcc] : undefined,
        reply_to: mail.replyTo,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      }),
    }),
    20000,
    'Resend API'
  );
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`resend ${response.status}: ${body.slice(0, 240)}`);
  }
  return { messageId: 'resend', via: 'resend' };
};

const sendViaHttp = async (mail) => {
  if (webhookUrl()) return sendViaWebhook(mail);
  if (resendKey()) return sendViaResend(mail);
  return null;
};

const resolveRecipient = (order) => {
  const raw = order?.customerEmail || order?.guestEmail || order?.user?.email;
  const to = String(raw || '').trim().toLowerCase();
  if (!to || !EMAIL_RE.test(to)) return '';
  return to;
};

const buildMailPayload = (order, to) => {
  const orderId = String(order.id || '').slice(0, 8).toUpperCase();
  const senderEmail = smtpUser() || 'okzeg3@gmail.com';
  const senderName = (cleanEnv('MAIL_FROM_NAME', 'OKZ') || 'OKZ').replace(/"/g, '');
  const from = `"${senderName}" <${senderEmail}>`;
  const replyTo = cleanEnv('MAIL_REPLY_TO', senderEmail) || senderEmail;
  const bccRaw = cleanEnv('MAIL_BCC', senderEmail) || senderEmail;
  const bcc = bccRaw.toLowerCase() === to.toLowerCase() ? undefined : bccRaw;

  let html;
  try {
    html = buildOrderConfirmationHtml(order);
  } catch (htmlError) {
    console.error('[mail] HTML template failed, sending text only:', htmlError.message);
  }

  const textLines = [
    `OKZ order confirmation #${orderId}`,
    '',
    `Hi ${order.customerName || order.guestName || 'there'},`,
    'Thanks — we received your order.',
    '',
    `Payment: ${order.paymentMethod || '—'}`,
    `Total: ${formatMoney(order.totalPrice)}`,
    '',
    ...(order.items || []).map((item) => {
      const meta = [item.color, item.size ? `Size ${item.size}` : null, `×${item.qty}`]
        .filter(Boolean)
        .join(' · ');
      return `- ${item.name}${meta ? ` (${meta})` : ''} — ${formatMoney(
        Number(item.price) * Number(item.qty)
      )}`;
    }),
    '',
    'We’ll contact you within 12 hours to confirm.',
    `Help: ${senderEmail}`,
  ];

  return {
    from,
    to,
    bcc,
    replyTo,
    envelope: { from: senderEmail, to: bcc ? [to, bcc] : to },
    subject: `OKZ order confirmed · #${orderId}`,
    html,
    text: textLines.join('\n'),
  };
};

const trySendWithTransport = async (transport, mail) => {
  try {
    return await sendViaTransport(transport, mail);
  } catch (error) {
    if (!mail.html) throw error;
    console.warn('[mail] HTML send failed, retrying text-only:', formatSmtpError(error));
    return sendViaTransport(transport, { ...mail, html: undefined });
  }
};

const sendOrderConfirmationEmail = async (order) => {
  try {
    const to = resolveRecipient(order);
    if (!to) {
      lastSend = { at: new Date().toISOString(), to: null, sent: false, error: 'no_email', via: null };
      console.warn('[mail] Skipping order confirmation — missing or invalid email');
      return { skipped: true, reason: 'no_email' };
    }

    const mail = buildMailPayload(order, to);

    if (hasHttpRelay()) {
      try {
        const info = await sendViaHttp(mail);
        lastSend = {
          at: new Date().toISOString(),
          to: maskEmail(to),
          sent: true,
          error: null,
          via: info.via,
        };
        console.log(`[mail] Order confirmation sent to ${to} via ${info.via}`);
        return { sent: true, messageId: info.messageId, via: info.via };
      } catch (error) {
        console.error('[mail] HTTP relay failed:', formatSmtpError(error));
        lastSend = {
          at: new Date().toISOString(),
          to: maskEmail(to),
          sent: false,
          error: formatSmtpError(error),
          via: 'http',
        };
        if (lastProbe.verified === false) {
          return { sent: false, error: formatSmtpError(error) };
        }
      }
    }

    if (!isMailConfigured()) {
      lastSend = {
        at: new Date().toISOString(),
        to: maskEmail(to),
        sent: false,
        error: 'not_configured',
        via: null,
      };
      console.warn('[mail] SMTP not configured (set SMTP_USER and SMTP_PASS). Skipping order confirmation.');
      return { skipped: true, reason: 'not_configured' };
    }

    if (lastProbe.verified === false) {
      const error =
        'Railway cannot reach smtp.gmail.com (ports 465/587 timed out). Set MAIL_WEBHOOK_URL (Google Apps Script) or RESEND_API_KEY.';
      lastSend = { at: new Date().toISOString(), to: maskEmail(to), sent: false, error, via: null };
      console.error(`[mail] ${error}`);
      return { sent: false, error };
    }

    const nm = loadNodemailer();
    if (!nm) {
      lastSend = {
        at: new Date().toISOString(),
        to: maskEmail(to),
        sent: false,
        error: 'nodemailer_missing',
        via: null,
      };
      return { skipped: true, reason: 'nodemailer_missing' };
    }

    if (cachedTransport) {
      try {
        const info = await trySendWithTransport(cachedTransport, mail);
        lastSend = {
          at: new Date().toISOString(),
          to: maskEmail(to),
          sent: true,
          error: null,
          via: cachedAttemptLabel || 'cached',
        };
        console.log(
          `[mail] Order confirmation sent to ${to} via ${cachedAttemptLabel || 'cached'} (${info.messageId || 'ok'})`
        );
        return { sent: true, messageId: info.messageId };
      } catch (error) {
        console.warn(`[mail] Cached SMTP failed (${cachedAttemptLabel}): ${formatSmtpError(error)}`);
        destroyTransporter();
      }
    }

    const attempts = connectionAttempts();
    let lastError = 'no attempts';
    for (const attempt of attempts) {
      const transport = createTransportForAttempt(nm, attempt);
      try {
        console.log(`[mail] Trying SMTP ${attempt.label} to ${smtpHost()}`);
        const info = await trySendWithTransport(transport, mail);
        cachedTransport = transport;
        cachedAttemptLabel = attempt.label;
        lastProbe = {
          checkedAt: new Date().toISOString(),
          verified: true,
          error: null,
          via: attempt.label,
        };
        lastSend = {
          at: new Date().toISOString(),
          to: maskEmail(to),
          sent: true,
          error: null,
          via: attempt.label,
        };
        console.log(
          `[mail] Order confirmation sent to ${to} via ${attempt.label} (${info.messageId || 'ok'})`
        );
        return { sent: true, messageId: info.messageId, via: attempt.label };
      } catch (error) {
        lastError = formatSmtpError(error);
        console.error(`[mail] SMTP ${attempt.label} failed: ${lastError}`);
        destroyTransporter(transport);
      }
    }

    lastSend = { at: new Date().toISOString(), to: maskEmail(to), sent: false, error: lastError, via: null };
    lastProbe = { checkedAt: new Date().toISOString(), verified: false, error: lastError, via: null };
    return { sent: false, error: lastError };
  } catch (error) {
    destroyTransporter();
    const message = formatSmtpError(error);
    lastSend = { at: new Date().toISOString(), to: null, sent: false, error: message, via: null };
    console.error('[mail] Failed to send order confirmation:', message);
    return { sent: false, error: message };
  }
};

const queueOrderConfirmationEmail = (order) => {
  Promise.resolve()
    .then(() => sendOrderConfirmationEmail(order))
    .catch((error) => {
      console.error('[mail] Background confirmation failed:', error?.message || error);
    });
};

const getMailStatus = () => ({
  configured: isMailConfigured() || hasHttpRelay(),
  host: smtpHost(),
  user: maskEmail(smtpUser()),
  gmail: isGmail(),
  passLen: smtpPass().length,
  appPasswordLen: smtpPass().length === 16,
  smtpReachable: lastProbe.verified,
  httpRelay: hasHttpRelay(),
  probe: lastProbe,
  lastSend,
});

const logMailStatus = () => {
  const status = getMailStatus();
  if (!status.configured) {
    console.warn(
      `[mail] NOT CONFIGURED — set SMTP_USER and SMTP_PASS (optional SMTP_HOST, currently ${status.host})`
    );
    return status;
  }
  console.log(
    `[mail] configured user=${status.user} host=${status.host} gmail=${status.gmail} passLen=${status.passLen}`
  );
  return status;
};

const startMailProbe = () => {
  if (!isMailConfigured()) {
    lastProbe = {
      checkedAt: new Date().toISOString(),
      verified: false,
      error: 'not_configured',
      via: null,
    };
    return;
  }
  const nm = loadNodemailer();
  if (!nm) {
    lastProbe = {
      checkedAt: new Date().toISOString(),
      verified: false,
      error: 'nodemailer_missing',
      via: null,
    };
    return;
  }

  (async () => {
    const attempts = connectionAttempts();
    let lastError = 'no attempts';
    for (const attempt of attempts) {
      const transport = createTransportForAttempt(nm, attempt);
      try {
        console.log(`[mail] Verifying SMTP ${attempt.label}`);
        await withTimeout(transport.verify(), SMTP_CONNECT_MS, `SMTP verify ${attempt.label}`);
        cachedTransport = transport;
        cachedAttemptLabel = attempt.label;
        lastProbe = {
          checkedAt: new Date().toISOString(),
          verified: true,
          error: null,
          via: attempt.label,
        };
        console.log(`[mail] SMTP verified via ${attempt.label}`);
        return;
      } catch (error) {
        lastError = formatSmtpError(error);
        console.error(`[mail] SMTP verify ${attempt.label} failed: ${lastError}`);
        destroyTransporter(transport);
      }
    }
    lastProbe = {
      checkedAt: new Date().toISOString(),
      verified: false,
      error: lastError,
      via: null,
    };
  })().catch((error) => {
    lastProbe = {
      checkedAt: new Date().toISOString(),
      verified: false,
      error: formatSmtpError(error),
      via: null,
    };
  });
};

module.exports = {
  isMailConfigured,
  sendOrderConfirmationEmail,
  queueOrderConfirmationEmail,
  getMailStatus,
  logMailStatus,
  startMailProbe,
};
