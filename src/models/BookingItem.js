const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BookingItem = sequelize.define('BookingItem', {
  booking_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  product_id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false },
  price: { type: DataTypes.INTEGER, allowNull: false }
}, { 
  tableName: 'booking_items', 
  timestamps: false 
});

module.exports = BookingItem;