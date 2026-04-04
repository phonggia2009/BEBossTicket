'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tickets', {
      ticket_id: {
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
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'bookings', key: 'booking_id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      seat_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'Seats', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      price: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('BOOKED', 'CANCELLED'),
        defaultValue: 'BOOKED'
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tickets');
  }
};