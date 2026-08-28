import api from '../api/axios';

const seen = new Map();
const DEDUP_MS = 15 * 60 * 1000;

const shouldSkip = (message = '') => {
  const m = String(message);
  if (!m.trim()) return true;
  if (/ResizeObserver loop/i.test(m)) return true;
  if (/Loading chunk \d+ failed/i.test(m)) return true;
  if (/Failed to fetch dynamically imported module/i.test(m)) return true;
  return false;
};

const fingerprint = (payload) =>
  [payload.type, payload.message, payload.url, payload.apiUrl, payload.status].join('|');

const sendReport = (payload) => {
  if (shouldSkip(payload.message)) return;
  const key = fingerprint(payload);
  const now = Date.now();
  const last = seen.get(key);
  if (last && now - last < DEDUP_MS) return;
  seen.set(key, now);

  api
    .post('/alerts/client-error', payload, { timeout: 8000 })
    .catch(() => {});
};

export const reportClientError = (payload) => sendReport(payload);

export const reportApiError = (error) => {
  const status = error.response?.status;
  const apiUrl = error.config?.url || '';
  if (apiUrl.includes('/alerts/')) return;
  if (status === 401 || status === 403 || status === 404) return;
  if (status && status < 500 && status !== 429) return;

  const message =
    error.response?.data?.message ||
    error.message ||
    (status ? `Request failed with status ${status}` : 'Network error');

  sendReport({
    type: status ? 'api' : 'network',
    message: String(message).slice(0, 2000),
    status: status || null,
    apiUrl: String(apiUrl).slice(0, 500),
    url: typeof window !== 'undefined' ? window.location.href : '',
    stack: error.stack ? String(error.stack).slice(0, 4000) : '',
  });
};

export function installClientErrorReporting() {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    sendReport({
      type: 'javascript',
      message: String(event.message || event.error?.message || 'Script error').slice(0, 2000),
      stack: event.error?.stack ? String(event.error.stack).slice(0, 4000) : '',
      url: event.filename || window.location.href,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message =
      reason?.response?.data?.message ||
      reason?.message ||
      String(reason || 'Unhandled promise rejection');

    sendReport({
      type: 'promise',
      message: String(message).slice(0, 2000),
      stack: reason?.stack ? String(reason.stack).slice(0, 4000) : '',
      url: window.location.href,
      status: reason?.response?.status || null,
      apiUrl: reason?.config?.url || '',
    });
  });
}
