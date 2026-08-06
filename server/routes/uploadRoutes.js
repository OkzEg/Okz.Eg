const express = require('express');
const { uploadSiteAsset } = require('../controllers/uploadController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, adminOnly, ...uploadSiteAsset);

module.exports = router;
