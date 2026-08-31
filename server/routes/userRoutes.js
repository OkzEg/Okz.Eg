const express = require('express');
const {
  listUsers,
  createStaffUser,
  deleteUser,
  listCustomers,
} = require('../controllers/userController');
const {
  protect,
  adminOnly,
  opsOrAdmin,
  requireFreshStaff,
} = require('../middleware/authMiddleware');
const { adminLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', protect, requireFreshStaff, adminOnly, listUsers);
router.post('/', protect, requireFreshStaff, adminOnly, adminLimiter, createStaffUser);
router.delete('/:id', protect, requireFreshStaff, adminOnly, adminLimiter, deleteUser);
router.get('/customers', protect, requireFreshStaff, opsOrAdmin, listCustomers);

module.exports = router;
