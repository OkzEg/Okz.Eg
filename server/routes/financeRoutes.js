const express = require('express');
const {
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  financeOverview,
} = require('../controllers/financeController');
const { protect, adminOnly, requireFreshStaff } = require('../middleware/authMiddleware');
const { adminLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(protect, requireFreshStaff, adminOnly);

router.get('/overview', financeOverview);
router.get('/entries', listEntries);
router.post('/entries', adminLimiter, createEntry);
router.put('/entries/:id', adminLimiter, updateEntry);
router.delete('/entries/:id', adminLimiter, deleteEntry);

module.exports = router;
