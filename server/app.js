const path = require('path');
const express = require('express');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });

const cors = require('cors');
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

const app = express();

app.disable('x-powered-by');
app.use(compression());
app.use(cors());
// Slide writes may include base64 image data; skip JSON parsing for multipart uploads.
app.use((req, res, next) => {
  const isMultipart = String(req.headers['content-type'] || '').includes('multipart/form-data');
  if (isMultipart) return next();
  const slideWrite =
    req.path.startsWith('/api/slides') && ['POST', 'PUT', 'PATCH'].includes(req.method);
  express.json({ limit: slideWrite ? '8mb' : '2mb' })(req, res, next);
});
app.use(express.urlencoded({ limit: '2mb', extended: true }));

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
  res.json({ ok: true, mail: getMailStatus() });
});

app.get('/', (req, res) => {
  res.send('OKZ API is running');
});

module.exports = app;
