const { PrismaClient } = require('@prisma/client');

const globalForPrisma = globalThis;

const normalizeDatabaseUrl = (url, poolSize) => {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    const isPooler = parsed.hostname.includes('pooler.supabase.com');

    if (isPooler && parsed.port === '5432' && parsed.searchParams.get('pgbouncer') === 'true') {
      parsed.port = '6543';
    }

    parsed.searchParams.set('connection_limit', String(poolSize));
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', '30');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', '30');
    }
    if (parsed.port === '6543' && !parsed.searchParams.has('pgbouncer')) {
      parsed.searchParams.set('pgbouncer', 'true');
    }

    return parsed.toString();
  } catch {
    return url;
  }
};

const poolSize = Math.min(Math.max(Number(process.env.DB_POOL_SIZE) || 3, 1), 10);

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: { url: normalizeDatabaseUrl(process.env.DATABASE_URL, poolSize) },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
