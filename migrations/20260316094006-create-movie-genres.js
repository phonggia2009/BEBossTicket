'use strict';

/** @type {import('sequelize-cli').Migration} */
// migrations/XXXXXXXX-create-movie-genres.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('MovieGenres', {
      movieId: {
        type: Sequelize.INTEGER,
        references: { model: 'Movies', key: 'id' },
        onDelete: 'CASCADE' // Nếu xóa phim, liên kết này tự mất
      },
      genreId: {
        type: Sequelize.INTEGER,
        references: { model: 'Genres', key: 'id' },
        onDelete: 'CASCADE' // Nếu xóa thể loại, liên kết này tự mất
      },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) { await queryInterface.dropTable('MovieGenres'); }
};