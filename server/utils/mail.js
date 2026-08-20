const { buildOrderConfirmationHtml, formatMoney } = require('./orderEmailTemplate');

let transporter;
let nodemailer;

const SMTP_CONNECT_MS = Number(process.env.SMTP_CONNECT_TIMEOUT_MS || 8000);
const SMTP_SOCKET_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 15000);
const SMTP_SEND_MS = Number(process.env.SMTP_SEND_TIMEOUT_MS || 20000);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loadNodemailer = () => {
  if (nodemailer) return nodemailer;
  try {
    // Lazy load so a missing install does not crash the whole API on boot
    nodemailer = require('nodemailer');
    return nodemailer;
  } catch (error) {
    console.error('[mail] nodemailer is not installed:', error.message);
    return null;
  }
};

const isMailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const destroyTransporter = () => {
  if (!transporter) return;
  try {
    transporter.close();
  } catch {
    /* ignore */
  }
  transporter = null;
};

const getTransporter = () => {
  if (!isMailConfigured()) return null;
  const nm = loadNodemailer();
  if (!nm) return null;
  if (!transporter) {
    const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
    const port = Number(process.env.SMTP_PORT || 587);
    const secure =
      String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
    transporter = nm.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass,
      },
      // Gmail + IPv6 often hangs on PaaS until the proxy returns 502
      family: 4,
      connectionTimeout: SMTP_CONNECT_MS,
      greetingTimeout: SMTP_CONNECT_MS,
      socketTimeout: SMTP_SOCKET_MS,
      tls: { minVersion: 'TLSv1.2' },
    });
  }
  return transporter;
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

const resolveRecipient = (order) => {
  const raw = order?.customerEmail || order?.guestEmail || order?.user?.email;
  const to = String(raw || '').trim().toLowerCase();
  if (!to || !EMAIL_RE.test(to)) return '';
  return to;
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

    const transport = getTransporter();
    if (!transport) {
      console.warn(
        '[mail] SMTP not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS). Skipping order confirmation.'
      );
      return { skipped: true, reason: 'not_configured' };
    }

    const orderId = String(order.id || '').slice(0, 8).toUpperCase();
    const senderEmail = process.env.SMTP_USER || 'okzeg3@gmail.com';
    const senderName = (process.env.MAIL_FROM_NAME || 'OKZ').trim() || 'OKZ';
    // Display name only — actual mailbox stays SMTP_USER (e.g. okzeg3@gmail.com)
    const from =
      process.env.SMTP_FROM ||
      process.env.MAIL_FROM ||
      `"${senderName.replace(/"/g, '')}" <${senderEmail}>`;
    const replyTo = process.env.MAIL_REPLY_TO || senderEmail;

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
      'Help: okzeg3@gmail.com',
    ];

    const info = await withTimeout(
      transport.sendMail({
        from,
        to,
        replyTo,
        subject: `OKZ order confirmed · #${orderId}`,
        html,
        text: textLines.join('\n'),
      }),
      SMTP_SEND_MS,
      'SMTP sendMail'
    );
    console.log(`[mail] Order confirmation sent to ${to} (${info.messageId || 'ok'})`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    destroyTransporter();
    console.error('[mail] Failed to send order confirmation:', error.message);
    return { sent: false, error: error.message };
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

module.exports = {
  isMailConfigured,
  sendOrderConfirmationEmail,
  queueOrderConfirmationEmail,
};
