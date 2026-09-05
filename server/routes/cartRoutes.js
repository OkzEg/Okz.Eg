const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getCart, saveCart } = require('../controllers/cartController');

router.route('/')
  .get(protect, getCart)
  .post(protect, saveCart);

module.exports = router;
