const express = require('express');
const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon,
} = require('../controllers/couponController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { couponLimiter, adminLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', protect, adminOnly, listCoupons);
router.post('/validate', couponLimiter, validateCoupon);
router.post('/', protect, adminOnly, adminLimiter, createCoupon);
router.put('/:id', protect, adminOnly, adminLimiter, updateCoupon);
router.delete('/:id', protect, adminOnly, adminLimiter, deleteCoupon);

module.exports = router;
