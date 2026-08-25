const ALLOWED_PAYMENT_METHODS = new Set([
  'Cash on Delivery',
  'InstaPay',
  'Online Wallet',
  'Vodafone Cash',
]);

const DIGITAL_PAYMENT_METHODS = new Set(['InstaPay', 'Online Wallet', 'Vodafone Cash']);

const MAX_ORDER_LINES = 15;
const MAX_QTY_PER_LINE = 10;
const MIN_PASSWORD_LENGTH = 8;

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const isValidEgyptianPhone = (value) => {
  let digits = normalizePhone(value);
  if (digits.startsWith('20') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }
  return /^01[0125]\d{8}$/.test(digits);
};

const normalizeEgyptianPhone = (value) => {
  let digits = normalizePhone(value);
  if (digits.startsWith('20') && digits.length === 12) {
    digits = `0${digits.slice(2)}`;
  }
  return digits;
};

const isValidEmail = (value) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

const assertPaymentMethod = (paymentMethod) => {
  const method = String(paymentMethod || '').trim();
  if (!ALLOWED_PAYMENT_METHODS.has(method)) {
    const err = new Error('Invalid payment method');
    err.status = 400;
    throw err;
  }
  return method;
};

const assertPassword = (password) => {
  const value = String(password || '');
  if (value.length < MIN_PASSWORD_LENGTH) {
    const err = new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    err.status = 400;
    throw err;
  }
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    const err = new Error('Password must include at least one letter and one number');
    err.status = 400;
    throw err;
  }
  return value;
};

const requiresPaymentReceipt = (paymentMethod) =>
  DIGITAL_PAYMENT_METHODS.has(String(paymentMethod || '').trim());

module.exports = {
  ALLOWED_PAYMENT_METHODS,
  DIGITAL_PAYMENT_METHODS,
  MAX_ORDER_LINES,
  MAX_QTY_PER_LINE,
  MIN_PASSWORD_LENGTH,
  normalizePhone,
  normalizeEgyptianPhone,
  isValidEgyptianPhone,
  isValidEmail,
  assertPaymentMethod,
  assertPassword,
  requiresPaymentReceipt,
};
