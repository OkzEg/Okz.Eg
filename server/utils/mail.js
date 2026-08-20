const { buildOrderConfirmationHtml, formatMoney } = require('./orderEmailTemplate');

let transporter;
let nodemailer;

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
  Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );

const getTransporter = () => {
  if (!isMailConfigured()) return null;
  const nm = loadNodemailer();
  if (!nm) return null;
  if (!transporter) {
    const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
    transporter = nm.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass,
      },
    });
  }
  return transporter;
};

/**
 * Send order confirmation email. Never throws — order placement must not fail
 * if mail delivery has a problem.
 */
const sendOrderConfirmationEmail = async (order) => {
  const to = order?.customerEmail || order?.guestEmail || order?.user?.email;
  if (!to) {
    console.warn('[mail] Skipping order confirmation — no customer email');
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

  const html = buildOrderConfirmationHtml(order);
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

  try {
    const info = await transport.sendMail({
      from,
      to,
      replyTo,
      subject: `OKZ order confirmed · #${orderId}`,
      html,
      text: textLines.join('\n'),
    });
    console.log(`[mail] Order confirmation sent to ${to} (${info.messageId || 'ok'})`);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[mail] Failed to send order confirmation:', error.message);
    return { sent: false, error: error.message };
  }
};

module.exports = {
  isMailConfigured,
  sendOrderConfirmationEmail,
};
