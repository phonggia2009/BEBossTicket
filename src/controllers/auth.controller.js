const authService = require('../services/auth.service');
const sendResponse = require('../utils/responseHelper');
const { User } = require('../models');
exports.register = async (req, res) => {
  try {
    // Gọi sang Service để xử lý logic
    const newUser = await authService.registerUser(req.body);

    // Trả về thông báo thành công
    return sendResponse(res, 201, 'Đăng ký tài khoản thành công!', {
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email
      }
    });

  } catch (error) {
    // Xử lý các lỗi cụ thể được ném ra từ Service
    if (error.message === 'EMAIL_EXISTS') {
      return sendResponse(res, 400, 'Email này đã được sử dụng!');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống khi đăng ký!', { error: error.message });
  }
};

exports.verifyAccount = async (req, res) => {
  try {
    const { token } = req.query;
    console.log("Token nhận được từ FE:", token);

    // Bây giờ User đã được định nghĩa nên hàm findOne sẽ chạy được
    const user = await User.findOne({ where: { verificationToken: token } });

    if (!user) {
      return res.status(400).json({ message: 'Liên kết đã được sử dụng hoặc không hợp lệ.' });
    }

    await user.update({
      isVerified: true,
      verificationToken: null
    });

    return res.status(200).json({ status: 'success', message: 'Xác thực thành công' });
  } catch (error) {
    console.error("LỖI TẠI BACKEND:", error);
    return res.status(500).json({ message: 'Lỗi hệ thống tại server', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Gọi sang Service
    const { user, token } = await authService.loginUser(email, password);

    // Phản hồi thành công
    return sendResponse(res, 200, 'Đăng nhập thành công!', {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    // Bắt lỗi sai thông tin đăng nhập
    if (error.message === 'INVALID_CREDENTIALS') {
      return sendResponse(res, 401, 'Email hoặc mật khẩu không chính xác!');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống khi đăng nhập!', { error: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ 
        code: 400, 
        status: 'error', 
        message: 'Vui lòng cung cấp email!' 
      });
    }

    await authService.forgotPassword(email);

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Liên kết đặt lại mật khẩu đã được gửi vào email của bạn!'
    });
  } catch (error) {
    if (error.message === 'EMAIL_NOT_FOUND') {
      return res.status(404).json({ 
        code: 404, 
        status: 'error', 
        message: 'Email này không tồn tại trong hệ thống!' 
      });
    }
    return res.status(500).json({ 
      code: 500, 
      status: 'error', 
      message: 'Lỗi hệ thống!', 
      error: error.message 
    });
  }
};

// 2. Xử lý đặt lại mật khẩu mới
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        code: 400, 
        status: 'error', 
        message: 'Thiếu thông tin xác thực hoặc mật khẩu mới!' 
      });
    }

    await authService.resetPassword(token, newPassword);

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Mật khẩu của bạn đã được cập nhật thành công!'
    });
  } catch (error) {
    if (error.message === 'TOKEN_INVALID_OR_EXPIRED') {
      return res.status(400).json({ 
        code: 400, 
        status: 'error', 
        message: 'Liên kết đã hết hạn hoặc không hợp lệ. Vui lòng thử lại!' 
      });
    }
    return res.status(500).json({ 
      code: 500, 
      status: 'error', 
      message: 'Lỗi hệ thống khi đặt lại mật khẩu!', 
      error: error.message 
    });
  }
};