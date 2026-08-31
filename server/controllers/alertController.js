const { queueErrorAlertEmail } = require('../utils/mail');

const DEDUP_MS = 15 * 60 * 1000;
const recentAlerts = new Map();

const IGNORED_MESSAGE_PATTERNS = [
  /^Script error\.?$/i,
  /ResizeObserver loop/i,
  /Loading chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Network Error/i,
  /Request aborted/i,
  /cancelled/i,
  /Java object is gone/i,
  /Error invoking postMessage/i,
  /navigation_performance_logger/i,
];

const isNoiseUrl = (url = '') => /^iabjs:/i.test(String(url || ''));

const shouldIgnore = (payload = {}) => {
  const message = String(payload.message || '');
  if (IGNORED_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) return true;
  if (isNoiseUrl(payload.url) || isNoiseUrl(payload.stack)) return true;
  return false;
};

const fingerprint = ({ type, message, url, status }) =>
  [type, String(message || '').slice(0, 160), url || '', status || ''].join('|');

const markAndCheckDuplicate = (key) => {
  const now = Date.now();
  for (const [k, ts] of recentAlerts) {
    if (now - ts > DEDUP_MS) recentAlerts.delete(k);
  }
  if (recentAlerts.has(key)) return true;
  recentAlerts.set(key, now);
  return false;
};

const formatAlert = (payload, req) => {
  const lines = [
    `Type: ${payload.type || 'unknown'}`,
    `Message: ${payload.message || '—'}`,
    payload.status ? `HTTP status: ${payload.status}` : null,
    payload.url ? `Page: ${payload.url}` : null,
    payload.apiUrl ? `API: ${payload.apiUrl}` : null,
    payload.stack ? `\nStack:\n${payload.stack}` : null,
    `\nVisitor IP: ${req.ip || 'unknown'}`,
    `User agent: ${req.headers['user-agent'] || 'unknown'}`,
    `Time (UTC): ${new Date().toISOString()}`,
  ].filter(Boolean);

  const subjectBits = [
    payload.type || 'Site error',
    payload.status ? `HTTP ${payload.status}` : null,
    payload.message ? String(payload.message).slice(0, 80) : null,
  ].filter(Boolean);

  const subject = `[OKZ Warning] ${subjectBits.join(' · ')}`.slice(0, 180);
  const text = lines.join('\n');
  const html = `<pre style="font-family:monospace;font-size:13px;line-height:1.5">${text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</pre>`;

  return { subject, text, html };
};

const reportClientError = async (req, res) => {
  try {
    const payload = {
      type: String(req.body?.type || 'client').slice(0, 40),
      message: String(req.body?.message || '').slice(0, 2000),
      stack: String(req.body?.stack || '').slice(0, 4000),
      url: String(req.body?.url || '').slice(0, 500),
      apiUrl: String(req.body?.apiUrl || '').slice(0, 500),
      status: req.body?.status != null ? Number(req.body.status) : null,
    };

    if (!payload.message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }

    if (shouldIgnore(payload)) {
      return res.json({ ok: true, skipped: true });
    }

    if (payload.status === 401 || payload.status === 403 || payload.status === 404) {
      return res.json({ ok: true, skipped: true });
    }

    const key = fingerprint(payload);
    if (markAndCheckDuplicate(key)) {
      return res.json({ ok: true, deduped: true });
    }

    const alert = formatAlert(payload, req);
    queueErrorAlertEmail(alert);
    return res.json({ ok: true });
  } catch (error) {
    console.error('[alerts] reportClientError failed:', error);
    return res.status(500).json({ message: 'Could not record alert' });
  }
};

const reportServerError = (err, req) => {
  try {
    const message = String(err?.message || 'Server error');
    const payload = {
      type: 'server',
      message,
      stack: String(err?.stack || '').slice(0, 4000),
      url: `${req.method} ${req.originalUrl || req.path}`,
      status: err.status && err.status >= 500 ? err.status : 500,
    };
    if (shouldIgnore(payload)) return;

    const key = fingerprint(payload);
    if (markAndCheckDuplicate(key)) return;

    const alert = formatAlert(payload, req);
    queueErrorAlertEmail(alert);
  } catch (reportError) {
    console.error('[alerts] reportServerError failed:', reportError);
  }
};

module.exports = { reportClientError, reportServerError };
