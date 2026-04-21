const { Setting } = require('../models');

const maintenanceMiddleware = async (req, res, next) => {
  try {
    // Các path này luôn được đi qua dù đang bảo trì
    const bypassPaths = [
      '/api/settings',  // Frontend cần đọc trạng thái bảo trì
      '/api/auth',      // Admin cần đăng nhập để tắt bảo trì
    ];

    const isBypassed = bypassPaths.some(path => req.path.startsWith(path));
    if (isBypassed) return next();

    const setting = await Setting.findOne({ where: { id: 1 } });

    // Không có setting hoặc không bảo trì → đi qua bình thường
    if (!setting?.maintenanceMode) return next();

    // ADMIN luôn đi qua được (req.user được gán bởi attachUser trước đó)
    if (req.user?.role === 'ADMIN') return next();

    return res.status(503).json({
      message: 'Website đang bảo trì, vui lòng quay lại sau.'
    });
  } catch (error) {
    // Lỗi DB → cho đi qua, tránh chặn nhầm toàn bộ website
    next();
  }
};

module.exports = maintenanceMiddleware;