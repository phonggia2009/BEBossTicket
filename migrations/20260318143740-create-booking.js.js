'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bookings', {
      booking_id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' }, // Cập nhật tên bảng 'users' cho khớp với DB của bạn
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      showtime_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Showtimes', key: 'id' }, 
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      booking_time: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      total_price: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'SUCCESS', 'CANCELLED'),
        defaultValue: 'PENDING'
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('bookings');
  }
};