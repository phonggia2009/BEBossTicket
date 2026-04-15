// migrations/XXXXXXXXXXXXXX-create-point-history.js
'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('PointHistories', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      change_amount: {
        type: Sequelize.INTEGER, // Ví dụ: +100 hoặc -50
        allowNull: false
      },
      balance_after: {
        type: Sequelize.INTEGER, // Số dư sau khi thay đổi
        allowNull: false
      },
      reason: {
        type: Sequelize.STRING, // Lý do: "Đặt vé #123", "Admin tặng", "Hoàn vé"
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('PointHistories');
  }
};