const rateLimit = require('express-rate-limit');

const skipSuccessfulHealth = (req) => req.path === '/api/health' || req.path === '/';

const base = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
};

const globalLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 400,
  message: { message: 'Too many requests, please try again later' },
  skip: skipSuccessfulHealth,
});

const authLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: 'Too many login attempts, please try again later' },
});

const registerLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many accounts created from this network, try later' },
});

const orderLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 8,
  message: { message: 'Too many orders from this network. Please wait before placing another.' },
});

const guestOrderLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { message: 'Too many guest orders from this network. Please wait or sign in.' },
});

const receiptUploadLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { message: 'Too many receipt uploads, please try again later' },
});

const couponLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  max: 40,
  message: { message: 'Too many coupon checks, please try again later' },
});

const reviewLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { message: 'Too many reviews, please try again later' },
});

module.exports = {
  globalLimiter,
  authLimiter,
  registerLimiter,
  orderLimiter,
  guestOrderLimiter,
  receiptUploadLimiter,
  couponLimiter,
  reviewLimiter,
};
