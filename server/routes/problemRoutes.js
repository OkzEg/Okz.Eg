const express = require('express');
const { listProblems, createProblem, updateProblem } = require('../controllers/problemController');
const { protect, opsOrAdmin, requireFreshStaff } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, requireFreshStaff, opsOrAdmin, listProblems);
router.post('/', protect, requireFreshStaff, opsOrAdmin, createProblem);
router.patch('/:id', protect, requireFreshStaff, opsOrAdmin, updateProblem);

module.exports = router;
