const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  fullName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  googleId: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  role: {
    type: DataTypes.ENUM('ADMIN', 'USER'),
    defaultValue: 'USER',
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // 2. Token để gửi qua email xác thực
  verificationToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  points: {
    type: DataTypes.INTEGER,
    defaultValue: 0, 
  },
  // 3. Token để phục vụ quên mật khẩu
  resetToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // 4. Thời hạn của token quên mật khẩu
  resetTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phoneNumber: DataTypes.STRING,
  avatarUrl: DataTypes.STRING,
}, {
  hooks: {
    // Tự động mã hóa mật khẩu trước khi lưu vào DB
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Hàm tiện ích để kiểm tra mật khẩu khi đăng nhập
User.prototype.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = User;