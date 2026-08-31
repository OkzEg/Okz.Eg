const prisma = require('../lib/prisma');

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

module.exports = { getTodayTraffic };
