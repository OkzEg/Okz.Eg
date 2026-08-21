const { buildOrderConfirmationHtml, formatMoney } = require('./orderEmailTemplate');

let nodemailer;
let cachedTransport;
let cachedAttemptLabel;

const SMTP_CONNECT_MS = Number(process.env.SMTP_CONNECT_TIMEOUT_MS || 20000);
const SMTP_SOCKET_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 25000);
const SMTP_SEND_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS || 30000);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanEnv = (key, fallback = '') => {
  const raw = process.env[key];
  if (raw == null) return fallback;
  return String(raw)
    .trim()
    .replace(/^['"]+|['"]+$/g, '');
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
    // Port 587 STARTTLS commonly hangs on PaaS (the original 502). Prefer 465 SSL.
    return [
      { port: 465, secure: true, family: 4, label: 'gmail:465/ssl/ipv4' },
      { port: 465, secure: true, family: 0, label: 'gmail:465/ssl' },
      { port: 587, secure: false, family: 4, label: 'gmail:587/starttls/ipv4' },
      { port: 587, secure: false, family: 0, label: 'gmail:587/starttls' },
    ];
  }

  const port = Number(cleanEnv('SMTP_PORT', '587')) || 587;
  const secure =
    cleanEnv('SMTP_SECURE').toLowerCase() === 'true' || port === 465;
  return [
    { port, secure, family: 4, label: `custom:${port}/${secure ? 'ssl' : 'starttls'}/ipv4` },
    { port, secure, family: 0, label: `custom:${port}/${secure ? 'ssl' : 'starttls'}` },
  ];
};

const createTransportForAttempt = (nm, attempt) => {
  const host = smtpHost();
  const options = {
    host,
    port: attempt.port,
    secure: attempt.secure,
    auth: {
      user: smtpUser(),
      pass: smtpPass(),
    },
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
  // Gmail only delivers when From matches the authenticated mailbox.
  const from = `"${senderName}" <${senderEmail}>`;
  const replyTo = cleanEnv('MAIL_REPLY_TO', senderEmail) || senderEmail;

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
    replyTo,
    envelope: { from: senderEmail, to },
    subject: `OKZ order confirmed · #${orderId}`,
    html,
    text: textLines.join('\n'),
  };
};

/**
 * Send order confirmation email. Never throws — order placement must not fail
 * if mail delivery has a problem.
 */
const sendOrderConfirmationEmail = async (order) => {
  try {
    const to = resolveRecipient(order);
    if (!to) {
      console.warn('[mail] Skipping order confirmation — missing or invalid email');
      return { skipped: true, reason: 'no_email' };
    }

    if (!isMailConfigured()) {
      console.warn(
        '[mail] SMTP not configured (set SMTP_USER and SMTP_PASS). Skipping order confirmation.'
      );
      return { skipped: true, reason: 'not_configured' };
    }

    const nm = loadNodemailer();
    if (!nm) return { skipped: true, reason: 'nodemailer_missing' };

    const mail = buildMailPayload(order, to);

    if (cachedTransport) {
      try {
        const info = await sendViaTransport(cachedTransport, mail);
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
        const info = await sendViaTransport(transport, mail);
        cachedTransport = transport;
        cachedAttemptLabel = attempt.label;
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

    return { sent: false, error: lastError };
  } catch (error) {
    destroyTransporter();
    console.error('[mail] Failed to send order confirmation:', formatSmtpError(error));
    return { sent: false, error: formatSmtpError(error) };
  }
};

/** Fire-and-forget so checkout can return 201 even if SMTP is slow or down. */
const queueOrderConfirmationEmail = (order) => {
  setImmediate(() => {
    Promise.resolve()
      .then(() => sendOrderConfirmationEmail(order))
      .catch((error) => {
        console.error('[mail] Background confirmation failed:', error?.message || error);
      });
  });
};

const getMailStatus = () => {
  const user = smtpUser();
  const masked =
    user && user.includes('@')
      ? `${user.slice(0, 2)}***@${user.split('@')[1]}`
      : user
        ? 'set'
        : '';
  return {
    configured: isMailConfigured(),
    host: smtpHost(),
    user: masked || null,
    gmail: isGmail(),
  };
};

const logMailStatus = () => {
  const status = getMailStatus();
  if (!status.configured) {
    console.warn(
      `[mail] NOT CONFIGURED — set SMTP_USER and SMTP_PASS (optional SMTP_HOST, currently ${status.host})`
    );
    return status;
  }
  console.log(
    `[mail] configured user=${status.user} host=${status.host} gmail=${status.gmail} passLen=${smtpPass().length}`
  );
  return status;
};

module.exports = {
  isMailConfigured,
  sendOrderConfirmationEmail,
  queueOrderConfirmationEmail,
  getMailStatus,
  logMailStatus,
};
