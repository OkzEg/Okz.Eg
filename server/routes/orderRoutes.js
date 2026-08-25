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
} = require('../controllers/orderController');
const {
  protect,
  adminOnly,
  opsOrAdmin,
  requireFreshStaff,
} = require('../middleware/authMiddleware');
const { orderLimiter, guestOrderLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/guest', guestOrderLimiter, createGuestOrder);
router.post('/', protect, orderLimiter, createOrder);
router.get('/mine', protect, myOrders);
router.get('/finance', protect, requireFreshStaff, adminOnly, financeSummary);
router.get('/', protect, requireFreshStaff, opsOrAdmin, listOrders);
router.get('/:id', protect, getOrder);
router.patch('/:id/status', protect, requireFreshStaff, opsOrAdmin, updateOrderStatus);
router.delete('/:id', protect, requireFreshStaff, opsOrAdmin, deleteOrder);

module.exports = router;
