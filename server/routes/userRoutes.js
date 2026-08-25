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

const router = express.Router();

router.get('/', protect, requireFreshStaff, adminOnly, listUsers);
router.post('/', protect, requireFreshStaff, adminOnly, createStaffUser);
router.delete('/:id', protect, requireFreshStaff, adminOnly, deleteUser);
router.get('/customers', protect, requireFreshStaff, opsOrAdmin, listCustomers);

module.exports = router;
