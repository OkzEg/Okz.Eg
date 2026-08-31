const express = require('express');
const { getTodayTraffic } = require('../controllers/trafficController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/today', protect, adminOnly, getTodayTraffic);

module.exports = router;
