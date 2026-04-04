const cacheService = require('../services/cache.service');

exports.userRateLimiter = async (req, res, next) => {
  // Giả sử có req.user.id từ middleware auth, nếu không dùng session ID / IP
  const userId = req.user?.id || req.ip; 
  const today = new Date().toISOString().split('T')[0];
  const countKey = `chat_count_${userId}_${today}`;
  const lockKey = `chat_lock_${userId}`;

  // 1. Chống Spam Request song song
  const isLocked = await cacheService.get(lockKey);
  if (isLocked) {
    return res.status(429).json({ message: 'Vui lòng đợi chatbot trả lời tin nhắn trước đó.' });
  }

  // 2. Kiểm tra giới hạn ngày (20 requests/ngày)
  let currentCount = await cacheService.get(countKey) || 0;
  if (currentCount >= 20) {
    return res.status(429).json({ message: 'Bạn đã hết lượt chat hôm nay (20/20). Vui lòng quay lại vào ngày mai.' });
  }

  // Khóa request hiện tại (mở khóa ở controller)
  await cacheService.set(lockKey, true, 30); // Khóa tối đa 30s đề phòng kẹt
  req.userId = userId;
  req.countKey = countKey;
  req.currentCount = currentCount;

  next();
};