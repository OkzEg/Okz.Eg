const express = require('express');
const { reportClientError } = require('../controllers/alertController');
const { alertLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/client-error', alertLimiter, reportClientError);

module.exports = router;
