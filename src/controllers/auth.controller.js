const authService = require('../services/auth.service');
const sendResponse = require('../utils/responseHelper');
const { User } = require('../models');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
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
        role: user.role,
        points: user.points || 0
      }
    });

  } catch (error) {
    // Bắt lỗi sai thông tin đăng nhập
    if (error.message === 'INVALID_CREDENTIALS') {
      return sendResponse(res, 401, 'Email hoặc mật khẩu không chính xác!');
    }
    if (error.message === 'ACCOUNT_NOT_VERIFIED') {
      return sendResponse(res, 403, 'Tài khoản chưa được xác thực. Vui lòng kiểm tra email để xác thực tài khoản!');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống khi đăng nhập!', { error: error.message });
  }
};

exports.loginGoogle = async (req, res) => {
  try {
    const { token } = req.body;

    // Xác minh token với Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    // Tìm user theo email
    let user = await User.findOne({ where: { email } });

    if (!user) {
      // Nếu chưa có, tạo user mới
      user = await User.create({
        fullName: name,
        email: email,
        googleId: googleId,
        avatarUrl: picture,
        isVerified: true, // Google đã xác minh email rồi
        role: 'USER'
      });
    } else {
      // Nếu user đã tồn tại bằng cách đăng ký tay trước đó nhưng nay đăng nhập Google
      if (!user.googleId) {
        await user.update({ googleId, isVerified: true });
      }
    }

    // Ở đây bạn sử dụng hàm sinh token nội bộ (JWT) giống như trong authService.loginUser
    // Thay authService.generateToken bằng hàm thực tế bạn đang dùng trong auth.service.js
    const jwtToken = await authService.generateToken(user); 

    return sendResponse(res, 200, 'Đăng nhập Google thành công!', {
      token: jwtToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        points: user.points || 0
      }
    });

  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
    return sendResponse(res, 401, 'Xác thực Google thất bại!');
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