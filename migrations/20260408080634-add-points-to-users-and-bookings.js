'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Thêm cột 'points' vào bảng Users
      await queryInterface.addColumn('Users', 'points', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      }, { transaction });

      // 2. Thêm cột 'points_used' vào bảng Bookings
      await queryInterface.addColumn('bookings', 'points_used', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      }, { transaction });

      // 3. Thêm cột 'points_earned' vào bảng Bookings
      await queryInterface.addColumn('bookings', 'points_earned', {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
      }, { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Xóa các cột đã thêm nếu chạy lệnh undo migration
      await queryInterface.removeColumn('Users', 'points', { transaction });
      await queryInterface.removeColumn('Bookings', 'points_used', { transaction });
      await queryInterface.removeColumn('Bookings', 'points_earned', { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};