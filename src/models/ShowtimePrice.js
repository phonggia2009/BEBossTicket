// models/ShowtimePrice.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ShowtimePrice = sequelize.define('ShowtimePrice', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  showtime_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  seat_type: {
    type: DataTypes.STRING, // Khớp với Enum 'NORMAL', 'VIP'... trong bảng Seats
    allowNull: false
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'showtime_prices',
  timestamps: false
});

module.exports = ShowtimePrice;