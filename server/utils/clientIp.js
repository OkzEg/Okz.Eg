const pickFirstIp = (value) => {
  if (!value) return null;
  const first = String(value).split(',')[0]?.trim();
  return first || null;
};

const clientIpFromRequest = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const candidates = [
    pickFirstIp(forwarded),
    pickFirstIp(req.headers['x-real-ip']),
    pickFirstIp(req.headers['cf-connecting-ip']),
    pickFirstIp(req.headers['true-client-ip']),
    req.ip,
    req.socket?.remoteAddress,
  ].filter(Boolean);

  return {
    ip: candidates[0] || null,
    forwardedFor: forwarded ? String(forwarded) : null,
  };
};

module.exports = { clientIpFromRequest };
