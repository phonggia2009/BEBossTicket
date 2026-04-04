const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sendResponse = require('../utils/responseHelper');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 🔥 LẤY FULL USER TỪ DB
      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ['password'] }
      });

      if (!user) {
        return sendResponse(res, 401, 'User không tồn tại!');
      }

      req.user = user; 

      next();
    } catch (error) {
      return sendResponse(res, 401, 'Token không hợp lệ hoặc đã hết hạn!');
    }
  }

  if (!token) {
    return sendResponse(res, 401, 'Bạn chưa đăng nhập!');
  }
};
const restrictTo = (...roles) => {
  return (req, res, next) => {
    // req.user được gán giá trị từ middleware 'protect' chạy trước đó
    if (!roles.includes(req.user.role)) {
      return sendResponse(
        res, 
        403, // 403 Forbidden: Có login nhưng không đủ quyền
        'Bạn không có quyền truy cập vào chức năng này!'
      );
    }
    next();
  };
};

module.exports = { protect, restrictTo };