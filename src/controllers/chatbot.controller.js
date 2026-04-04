const chatbotService = require('../services/chatbot.service');
const cacheService = require('../services/cache.service');

exports.chat = async (req, res) => {
  const userId = req.user?.id;
  const { countKey, currentCount } = req;
  const lockKey = `chat_lock_${userId}`;

  try {
    const { message, history } = req.body;

    // 1. Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ message: 'Tin nhắn không được để trống.' });
    }
    if (message.length > 300) {
      return res.status(400).json({ message: 'Tin nhắn vượt quá 300 ký tự.' });
    }

    // 2. Validate và chuẩn hoá history
    const rawHistory = Array.isArray(history) ? history : [];
    const optimizedHistory = rawHistory
      .filter((h) => h && typeof h.role === 'string' && typeof h.content === 'string')
      .slice(-6); // Giữ 6 lượt gần nhất

    // 3. Gọi service xử lý logic chatbot
    const reply = await chatbotService.processChat(message.trim(), optimizedHistory, userId);

    // 4. Tăng bộ đếm rate limit (TTL 24h)
    await cacheService.set(countKey, currentCount + 1, 86400);

    return res.status(200).json({ reply });
  } catch (error) {
    console.error('[ChatbotController] Error:', error);
    return res.status(500).json({ message: 'Hệ thống AI đang bận, vui lòng thử lại sau.' });
  } finally {
    // 5. Luôn giải phóng lock dù thành công hay lỗi
    await cacheService.delete(lockKey);
  }
};