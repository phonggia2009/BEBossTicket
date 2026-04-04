const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbot.controller');
const { ipRateLimiter } = require('../middlewares/rateLimit');
const { userRateLimiter } = require('../middlewares/userLimit');
const { protect } = require('../middlewares/authMiddleware');

// Chain: IP Limit -> Auth -> User Limit -> Controller
router.post('/', ipRateLimiter, protect, userRateLimiter, chatbotController.chat);

module.exports = router;