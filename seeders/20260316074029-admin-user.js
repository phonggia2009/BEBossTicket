'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Mã hóa mật khẩu thủ công cho tài khoản Admin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    return queryInterface.bulkInsert('Users', [{
      fullName: 'Quản trị viên hệ thống',
      email: 'admin@movieai.com',
      password: hashedPassword,
      role: 'ADMIN', // Gán quyền Admin
      phoneNumber: '0123456789',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },

  async down(queryInterface, Sequelize) {
    // Xóa tài khoản Admin nếu cần hoàn tác
    return queryInterface.bulkDelete('Users', { email: 'admin@movieai.com' }, {});
  }
};