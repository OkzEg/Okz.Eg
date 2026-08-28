const prisma = require('../lib/prisma');
const { clientIpFromRequest } = require('../utils/clientIp');

const SKIP_PREFIXES = ['/api/health', '/api/traffic'];

const shouldSkip = (req) => {
  if (req.method === 'OPTIONS') return true;
  const path = req.originalUrl?.split('?')[0] || req.path || '';
  return SKIP_PREFIXES.some((prefix) => path.startsWith(prefix));
};

const requestLogger = (req, res, next) => {
  if (shouldSkip(req)) return next();

  const startedAt = Date.now();
  const path = req.originalUrl?.split('?')[0] || req.path || '';
  const { ip, forwardedFor } = clientIpFromRequest(req);
  const userAgent = req.headers['user-agent'] ? String(req.headers['user-agent']).slice(0, 512) : null;
  const referer = req.headers.referer ? String(req.headers.referer).slice(0, 512) : null;

  res.on('finish', () => {
    const durationMs = Date.now() - startedAt;
    prisma.requestLog
      .create({
        data: {
          method: req.method,
          path: path.slice(0, 512),
          status: res.statusCode,
          ip,
          forwardedFor,
          userAgent,
          referer,
        },
      })
      .catch((err) => {
        if (durationMs > 5000) return;
        console.warn('Request log write failed:', err.message);
      });
  });

  return next();
};

module.exports = { requestLogger };
