const express = require('express');
const { listProblems, createProblem, updateProblem } = require('../controllers/problemController');
const { protect, opsOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, opsOrAdmin, listProblems);
router.post('/', protect, opsOrAdmin, createProblem);
router.patch('/:id', protect, opsOrAdmin, updateProblem);

module.exports = router;
