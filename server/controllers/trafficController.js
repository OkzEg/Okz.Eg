const prisma = require('../lib/prisma');
const { sendSimpleEmail } = require('../utils/mail');

const DEDUP_CART_MS = 5 * 1000; // 5 seconds cooldown per user/IP
const recentCartAlerts = new Map();

const startOfTodayUtc = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const getTodayTraffic = async (req, res) => {
  try {
    const since = startOfTodayUtc();
    const limit = Math.min(Math.max(Number(req.query.limit) || 500, 1), 2000);

    const [logs, total, pathGroups, ipGroups] = await Promise.all([
      prisma.requestLog.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.requestLog.count({ where: { createdAt: { gte: since } } }),
      prisma.requestLog.groupBy({
        by: ['path'],
        where: { createdAt: { gte: since } },
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),
      prisma.requestLog.groupBy({
        by: ['ip'],
        where: { createdAt: { gte: since }, ip: { not: null } },
        _count: { ip: true },
        orderBy: { _count: { ip: 'desc' } },
        take: 10,
      }),
    ]);

    res.json({
      since: since.toISOString(),
      total,
      returned: logs.length,
      topPaths: pathGroups.map((row) => ({ path: row.path, count: row._count.path })),
      topIps: ipGroups.map((row) => ({ ip: row.ip, count: row._count.ip })),
      logs,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Could not load traffic log' });
  }
};

const reportCartAdd = async (req, res) => {
  try {
    const { name, size, color, qty, price } = req.body;
    if (!name) return res.status(400).json({ message: 'Product name required' });

    // Use IP or logged-in user ID to track
    const identifier = req.user ? `user-${req.user.id}` : `ip-${req.ip}`;
    const now = Date.now();

    // Cleanup old alerts
    for (const [k, ts] of recentCartAlerts) {
      if (now - ts > DEDUP_CART_MS) recentCartAlerts.delete(k);
    }

    if (recentCartAlerts.has(identifier)) {
      return res.json({ ok: true, skipped: 'rate-limited' });
    }
    recentCartAlerts.set(identifier, now);

    const recipient = process.env.ADMIN_ALERT_EMAIL || 'okzeg3@gmail.com';
    if (!recipient) {
      return res.json({ ok: true, skipped: 'no-recipient' });
    }

    const userLabel = req.user ? `${req.user.name} (${req.user.email})` : `A guest user (IP: ${req.ip})`;
    const variantLabel = [size ? `Size ${size}` : '', color ? `Color ${color}` : ''].filter(Boolean).join(', ');

    const text = `${userLabel} just added an item to their cart:

Product: ${name}
Quantity: ${qty || 1}
Price: ${price || 'N/A'} EGP
${variantLabel ? `Variant: ${variantLabel}` : ''}`;

    await sendSimpleEmail({
      to: recipient,
      subject: `🛒 Cart Activity: ${name}`,
      text,
    });

    res.json({ ok: true });
  } catch (error) {
    console.error('[trafficController] cart-add failed:', error);
    res.status(500).json({ message: 'Failed to record cart activity' });
  }
};

module.exports = { getTodayTraffic, reportCartAdd };
