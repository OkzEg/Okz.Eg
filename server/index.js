const app = require('./app');
const prisma = require('./lib/prisma');
const { logMailStatus, startMailProbe } = require('./utils/mail');
const { startAbandonedCartWorker } = require('./workers/abandonedCartWorker');

const PORT = process.env.PORT || 5000;
const MAX_DB_ATTEMPTS = 5;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const connectWithRetry = async () => {
  let lastError;
  for (let attempt = 1; attempt <= MAX_DB_ATTEMPTS; attempt += 1) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (error) {
      lastError = error;
      console.error(
        `Database connect attempt ${attempt}/${MAX_DB_ATTEMPTS} failed: ${error.message}`
      );
      if (attempt < MAX_DB_ATTEMPTS) {
        await sleep(attempt * 1500);
      }
    }
  }
  throw lastError;
};

const start = async () => {
  try {
    if (!process.env.JWT_SECRET || String(process.env.JWT_SECRET).length < 16) {
      throw new Error('JWT_SECRET must be set (16+ chars)');
    }

    await connectWithRetry();
    await prisma.product.count().catch(() => null);
    await prisma.slide.count().catch(() => null);
    console.log('PostgreSQL connected (Supabase)');

    if (!process.env.TURNSTILE_SECRET_KEY) {
      console.warn('TURNSTILE_SECRET_KEY missing — checkout bot check is rate-limit only');
    }
    if (!process.env.CORS_ORIGINS) {
      console.warn('CORS_ORIGINS missing — allowing all origins');
    }

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      logMailStatus();
      startMailProbe();
      startAbandonedCartWorker();
    });

    const shutdown = async (signal) => {
      console.log(`${signal} received, shutting down…`);
      server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
