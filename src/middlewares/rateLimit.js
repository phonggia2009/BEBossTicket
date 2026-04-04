const rateLimit = require('express-rate-limit');
exports.ipRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10, // Tối đa 10 requests
  message: {
    code: 429,
    status: 'error',
    message: 'IP của bạn đã vượt quá giới hạn 10 tin nhắn/giờ.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});