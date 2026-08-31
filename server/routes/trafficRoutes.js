const express = require('express');
const { getTodayTraffic, reportCartAdd } = require('../controllers/trafficController');
const { protect, adminOnly, optionalProtect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/today', protect, adminOnly, getTodayTraffic);

router.post('/cart-add', optionalProtect, reportCartAdd);

module.exports = router;
