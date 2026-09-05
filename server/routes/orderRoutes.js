const express = require('express');
const {
  createOrder,
  createGuestOrder,
  myOrders,
  getOrder,
  listOrders,
  updateOrderStatus,
  deleteOrder,
  financeSummary,
  analyticsData,
} = require('../controllers/orderController');
const {
  protect,
  adminOnly,
  opsOrAdmin,
  requireFreshStaff,
} = require('../middleware/authMiddleware');
const { orderLimiter, guestOrderLimiter, adminLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/guest', guestOrderLimiter, createGuestOrder);
router.post('/', protect, orderLimiter, createOrder);
router.get('/mine', protect, myOrders);
router.get('/finance', protect, requireFreshStaff, adminOnly, financeSummary);
router.get('/analytics', protect, requireFreshStaff, adminOnly, analyticsData);
router.get('/', protect, requireFreshStaff, opsOrAdmin, listOrders);
router.get('/:id', protect, getOrder);
router.patch('/:id/status', protect, requireFreshStaff, opsOrAdmin, adminLimiter, updateOrderStatus);
router.delete('/:id', protect, requireFreshStaff, adminOnly, adminLimiter, deleteOrder);

module.exports = router;
