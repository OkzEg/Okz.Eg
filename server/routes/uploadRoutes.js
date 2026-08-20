const express = require('express');
const { uploadSiteAsset, uploadPaymentReceipt } = require('../controllers/uploadController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/receipt', ...uploadPaymentReceipt);
router.post('/', protect, adminOnly, ...uploadSiteAsset);

module.exports = router;
