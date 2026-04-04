// migrations/XXXXXXXXXXXXXX-create-showtimes.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Showtimes', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      movie_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Movies', key: 'id' },
        onDelete: 'CASCADE'
      },
      room_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Rooms', key: 'id' },
        onDelete: 'CASCADE'
      },
      start_time: { type: Sequelize.DATE, allowNull: false },
      price: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      createdAt: { allowNull: false, type: Sequelize.DATE },
      updatedAt: { allowNull: false, type: Sequelize.DATE }
    });
  },
  async down(queryInterface, Sequelize) { await queryInterface.dropTable('Showtimes'); }
};