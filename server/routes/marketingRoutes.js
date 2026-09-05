const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { sendBulkEmail } = require('../controllers/marketingController');

router.post('/bulk-email', protect, adminOnly, sendBulkEmail);

module.exports = router;
