'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('showtime_prices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      showtime_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Showtimes', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Sử dụng trực tiếp chuỗi hoặc Enum tương ứng với bảng Seats
      seat_type: {
        type: Sequelize.STRING, // Ví dụ: 'NORMAL', 'VIP'
        allowNull: false
      },
      price: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Ràng buộc để một suất chiếu không có 2 mức giá cho cùng 1 loại ghế
    await queryInterface.addIndex('showtime_prices', ['showtime_id', 'seat_type'], {
      unique: true
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('showtime_prices');
  }
};