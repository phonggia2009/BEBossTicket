'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('Settings', 'moneyToPointRate', {
      type: Sequelize.INTEGER,
      defaultValue: 100000, // Tiêu 100k = 1 điểm
      allowNull: false
    });
    await queryInterface.addColumn('Settings', 'pointToMoneyRate', {
      type: Sequelize.INTEGER,
      defaultValue: 1000, // 1 điểm = 1000 VNĐ
      allowNull: false
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('Settings', 'moneyToPointRate');
    await queryInterface.removeColumn('Settings', 'pointToMoneyRate');
  }
};