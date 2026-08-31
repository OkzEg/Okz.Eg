const express = require('express');
const { handleChat } = require('../controllers/chatController');
const { chatLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/', chatLimiter, handleChat);

module.exports = router;
