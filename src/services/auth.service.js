const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mailer = require('../utils/mailer');
const { Op } = require('sequelize');

exports.registerUser = async (userData) => {
  // 1. Kiểm tra email đã tồn tại chưa
  const existingUser = await User.findOne({ where: { email: userData.email } });
  if (existingUser) {
    throw new Error('EMAIL_EXISTS'); 
  }

  // 2. Tạo verificationToken ngẫu nhiên
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // 3. Lưu user vào Database
  const newUser = await User.create({
    ...userData,
    verificationToken,
    isVerified: false
  });
  // 3. Gửi email xác thực (Bọc trong try-catch riêng để tránh lỗi 500 nếu mail chậm)
  try {
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-account?token=${verificationToken}`;
    
    // Giao diện Email chuyên nghiệp với tông màu Đen - Đỏ
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e1e1e1;">
        <div style="background-color: #000000; padding: 30px; text-align: center;">
          <h1 style="color: #dc2626; margin: 0; font-size: 28px; letter-spacing: 2px; font-weight: 900;">BOSSTICKET</h1>
          <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Trải nghiệm điện ảnh đích thực</p>
        </div>

        <div style="padding: 40px 30px; line-height: 1.6; color: #333333;">
          <h2 style="color: #111111; margin-top: 0; font-size: 20px;">Chào mừng ${newUser.fullName},</h2>
          <p style="margin-bottom: 20px;">Cảm ơn bạn đã lựa chọn đồng hành cùng <strong>BOSSTICKET</strong>. Để bắt đầu trải nghiệm đặt vé online và nhận các ưu đãi thành viên, vui lòng xác nhận tài khoản của bạn.</p>
          
          <div style="text-align: center; margin: 35px 0;">
            <a href="${verifyUrl}" style="background-color: #dc2626; color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.3); text-transform: uppercase; letter-spacing: 1px;">
              Xác thực tài khoản ngay
            </a>
          </div>

          <p style="font-size: 13px; color: #666666;">Liên kết này sẽ có hiệu lực trong vòng <strong>24 giờ</strong>. Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email.</p>
          <p style="font-size: 11px; color: #999; margin-top: 20px;">Nếu nút trên không hoạt động, bạn có thể copy link này: <br/> ${verifyUrl}</p>
        </div>

        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
          <p style="margin: 0; font-size: 12px; color: #999999;">
            Đây là email tự động, vui lòng không trả lời email này.<br>
            &copy; 2026 BOSSTICKET. Hệ thống đặt vé chuyên nghiệp.
          </p>
        </div>
      </div>
    `;

    await mailer.sendEmail(
      newUser.email,
      'Xác thực tài khoản BOSSTICKET',
      emailHtml
    );
    
    console.log(`[Email] Đã gửi link xác thực đến: ${newUser.email}`);
  } catch (mailError) {
    // Chỉ log lỗi mail ra console server, không trả lỗi về cho Client để đảm bảo User vẫn đăng ký được
    console.error("[Lỗi gửi mail]:", mailError.message);
  }

  // Trả về User đã tạo
  return newUser;
}

exports.loginUser = async (email, password) => {
  // 1. Tìm người dùng
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  if (!user.isVerified) {
    throw new Error('ACCOUNT_NOT_VERIFIED');
  }

  // 2. Kiểm tra mật khẩu
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // 3. Tạo JWT Token
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

  return { user, token };
};

exports.forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new Error('EMAIL_NOT_FOUND');

  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpires = Date.now() + 3600000; 

  await user.update({ resetToken, resetTokenExpires });

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  // Giao diện Email chuyên nghiệp hơn
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #dc2626; margin: 0;">BOSS TICKET</h1>
        <p style="color: #666; font-size: 14px;">Hệ thống đặt vé xem phim trực tuyến</p>
      </div>
      <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #333;">Khôi phục mật khẩu</h2>
        <p style="color: #555; line-height: 1.5;">Chào bạn, chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng nhấn vào nút bên dưới để tiếp tục:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 5px; display: inline-block;">ĐẶT LẠI MẬT KHẨU</a>
        </div>
        <p style="color: #888; font-size: 12px;">Link này có hiệu lực trong 1 giờ. Nếu bạn không yêu cầu thay đổi này, hãy bỏ qua email này.</p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 11px;">
        &copy; 2026 BOSSTICKET. All rights reserved.
      </div>
    </div>
  `;

  await mailer.sendEmail(email, 'Khôi phục mật khẩu Ticket Boss', emailHtml);
};

exports.resetPassword = async (token, newPassword) => {
  const user = await User.findOne({ 
    where: { 
      resetToken: token,
      resetTokenExpires: { [Op.gt]: Date.now() } 
    } 
  });

  if (!user) throw new Error('TOKEN_INVALID_OR_EXPIRED');

  // Cập nhật mật khẩu mới (hàm hash mật khẩu sẽ tự chạy nếu bạn dùng hooks trong model)
  await user.update({ 
    password: newPassword, 
    resetToken: null, 
    resetTokenExpires: null 
  });
};