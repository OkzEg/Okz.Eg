const phoneHits = new Map();
const PHONE_WINDOW_MS = 60 * 60 * 1000;
const MAX_ORDERS_PER_PHONE = 4;

const prunePhoneHits = (key, now) => {
  const list = (phoneHits.get(key) || []).filter((t) => now - t < PHONE_WINDOW_MS);
  if (list.length) phoneHits.set(key, list);
  else phoneHits.delete(key);
  return list;
};

const assertHoneypot = (body) => {
  const traps = ['website', 'companyUrl', 'fax', 'hp_field'];
  for (const key of traps) {
    if (String(body?.[key] || '').trim()) {
      const err = new Error('Order rejected');
      err.status = 400;
      throw err;
    }
  }
};

const verifyTurnstile = async (token, remoteip) => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return;

  if (!token || typeof token !== 'string') {
    const err = new Error('Complete the security check and try again');
    err.status = 400;
    throw err;
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteip) form.set('remoteip', remoteip);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const data = await res.json();
    if (!data?.success) {
      const err = new Error('Security check failed, please try again');
      err.status = 400;
      throw err;
    }
  } catch (error) {
    if (error.status) throw error;
    const err = new Error('Security check unavailable, please try again');
    err.status = 503;
    throw err;
  } finally {
    clearTimeout(timer);
  }
};

const assertPhoneVelocity = (phone) => {
  const key = String(phone || '');
  if (!key) return;
  const now = Date.now();
  const list = prunePhoneHits(key, now);
  if (list.length >= MAX_ORDERS_PER_PHONE) {
    const err = new Error(
      'Too many recent orders for this phone number. Please wait or contact support.'
    );
    err.status = 429;
    throw err;
  }
};

const recordPhoneOrder = (phone) => {
  const key = String(phone || '');
  if (!key) return;
  const now = Date.now();
  const list = prunePhoneHits(key, now);
  list.push(now);
  phoneHits.set(key, list);
};

const runCheckoutBotChecks = async (req, { phone } = {}) => {
  assertHoneypot(req.body);
  const token = req.body?.turnstileToken || req.body?.cfTurnstileResponse;
  const ip = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim();
  await verifyTurnstile(token, ip);
  if (phone) assertPhoneVelocity(phone);
};

module.exports = {
  assertHoneypot,
  verifyTurnstile,
  assertPhoneVelocity,
  recordPhoneOrder,
  runCheckoutBotChecks,
  MAX_ORDERS_PER_PHONE,
};
