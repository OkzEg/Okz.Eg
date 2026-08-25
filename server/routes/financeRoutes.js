const express = require('express');
const {
  listEntries,
  createEntry,
  updateEntry,
  deleteEntry,
  financeOverview,
} = require('../controllers/financeController');
const { protect, adminOnly, requireFreshStaff } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect, requireFreshStaff, adminOnly);

router.get('/overview', financeOverview);
router.get('/entries', listEntries);
router.post('/entries', createEntry);
router.put('/entries/:id', updateEntry);
router.delete('/entries/:id', deleteEntry);

module.exports = router;
