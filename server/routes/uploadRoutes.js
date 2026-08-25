const express = require('express');
const { uploadSiteAsset, uploadPaymentReceipt } = require('../controllers/uploadController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { receiptUploadLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/receipt', receiptUploadLimiter, ...uploadPaymentReceipt);
router.post('/', protect, adminOnly, ...uploadSiteAsset);

module.exports = router;
