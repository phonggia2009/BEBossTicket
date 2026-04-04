const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Ticket = sequelize.define('Ticket', {
  ticket_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  showtime_id: { type: DataTypes.INTEGER, allowNull: false },
  booking_id: { type: DataTypes.INTEGER, allowNull: false },
  seat_id: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.INTEGER, allowNull: false },  // giữ INTEGER
  status: { type: DataTypes.ENUM('BOOKED', 'CANCELLED'), defaultValue: 'BOOKED' }
}, { 
  tableName: 'tickets', 
  timestamps: false 
});

module.exports = Ticket;