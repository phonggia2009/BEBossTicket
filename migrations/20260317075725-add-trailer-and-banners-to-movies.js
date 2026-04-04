'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Movies', 'trailerUrl', { type: Sequelize.STRING });
    await queryInterface.addColumn('Movies', 'banners', { 
      type: Sequelize.JSONB, // Sử dụng JSONB cho PostgreSQL để lưu mảng URL
      defaultValue: []
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('Movies', 'trailerUrl');
    await queryInterface.removeColumn('Movies', 'banners');
  }
};
