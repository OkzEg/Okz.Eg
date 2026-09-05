const express = require('express');
const {
  registerCustomer,
  verifyEmail,
  resendVerification,
  login,
  googleAuth,
  getMe,
  updateProfile,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, registerLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', registerLimiter, registerCustomer);
router.post('/google', authLimiter, googleAuth);
router.post('/verify', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerification);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
