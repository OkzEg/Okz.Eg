const express = require('express');
const {
  listUsers,
  createStaffUser,
  deleteUser,
  listCustomers,
} = require('../controllers/userController');
const { protect, adminOnly, opsOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, adminOnly, listUsers);
router.post('/', protect, adminOnly, createStaffUser);
router.delete('/:id', protect, adminOnly, deleteUser);
router.get('/customers', protect, opsOrAdmin, listCustomers);

module.exports = router;
