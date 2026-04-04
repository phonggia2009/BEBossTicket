const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Seat = sequelize.define('Seat', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  seat_row: {
    type: DataTypes.STRING(2),
    allowNull: false
  },
  seat_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  seat_type: {
    type: DataTypes.ENUM('NORMAL', 'VIP', 'COUPLE'),
    defaultValue: 'NORMAL'
  },
  createdAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  updatedAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  }
}, {
  tableName: 'Seats',
  timestamps: true
});

module.exports = Seat;