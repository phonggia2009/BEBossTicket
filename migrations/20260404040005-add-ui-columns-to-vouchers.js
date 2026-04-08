'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Thêm cột title
    await queryInterface.addColumn('vouchers', 'title', {
      type: Sequelize.STRING,
      allowNull: true, // Để true để tránh báo lỗi với các voucher đã được tạo từ trước
    });

    // Thêm cột description
    await queryInterface.addColumn('vouchers', 'description', {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    // Thêm cột image
    await queryInterface.addColumn('vouchers', 'image', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    // Thêm cột tag
    await queryInterface.addColumn('vouchers', 'tag', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down (queryInterface, Sequelize) {
    // Xóa các cột này nếu bạn muốn hoàn tác (undo) migration
    await queryInterface.removeColumn('vouchers', 'title');
    await queryInterface.removeColumn('vouchers', 'description');
    await queryInterface.removeColumn('vouchers', 'image');
    await queryInterface.removeColumn('vouchers', 'tag');
  }
};