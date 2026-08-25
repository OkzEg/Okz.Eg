const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const slideRoutes = require('./routes/slideRoutes');
const couponRoutes = require('./routes/couponRoutes');
const problemRoutes = require('./routes/problemRoutes');
const financeRoutes = require('./routes/financeRoutes');
const { getMailStatus } = require('./utils/mail');
const { globalLimiter } = require('./middleware/rateLimit');
const { protect, adminOnly } = require('./middleware/authMiddleware');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);
app.use(compression());

const corsOrigins = String(process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(globalLimiter);

app.use((req, res, next) => {
  const isMultipart = String(req.headers['content-type'] || '').includes('multipart/form-data');
  if (isMultipart) return next();
  const slideWrite =
    req.path.startsWith('/api/slides') && ['POST', 'PUT', 'PATCH'].includes(req.method);
  express.json({ limit: slideWrite ? '8mb' : '1mb' })(req, res, next);
});
app.use(express.urlencoded({ limit: '1mb', extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/slides', slideRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/finance', financeRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/health/mail', protect, adminOnly, (req, res) => {
  res.json({ ok: true, mail: getMailStatus() });
});

app.get('/', (req, res) => {
  res.send('OKZ API is running');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'Origin not allowed' });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

module.exports = app;
