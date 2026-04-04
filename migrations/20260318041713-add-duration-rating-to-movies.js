'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Movies'); 

    if (!tableDesc.duration) {
      await queryInterface.addColumn('Movies', 'duration', {
        type:      Sequelize.INTEGER,
        allowNull: true,
        comment:   'Thời lượng phim (phút)',
      });
    }

    if (!tableDesc.rating) {
      await queryInterface.addColumn('Movies', 'rating', {
        type:      Sequelize.FLOAT,
        allowNull: true,
        comment:   'Điểm đánh giá (0–10)',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Movies', 'duration');
    await queryInterface.removeColumn('Movies', 'rating');
  },
};