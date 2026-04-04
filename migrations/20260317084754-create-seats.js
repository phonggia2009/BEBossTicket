// migrations/XXXXXXXXXXXXXX-create-seats.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Seats', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      room_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rooms',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      seat_row: {
        type: Sequelize.STRING(2), // Ví dụ: A, B, C...
        allowNull: false
      },
      seat_number: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      seat_type: {
        type: Sequelize.ENUM('standard', 'vip', 'couple'),
        defaultValue: 'standard'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    // Khi xóa bảng Seats, chúng ta cũng cần xóa ENUM seat_type nếu dùng PostgreSQL
    await queryInterface.dropTable('Seats');
    // await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Seats_seat_type";');
  }
};