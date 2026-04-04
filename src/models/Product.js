// models/Product.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  product_name: {
    type:      DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type:      DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  type: {
    type:         DataTypes.ENUM('FOOD', 'DRINK', 'COMBO'),
    allowNull:    false,
    defaultValue: 'FOOD',
  },
  quantity: {
    type:         DataTypes.INTEGER,
    allowNull:    false,
    defaultValue: 0,
  },
  imageUrl: {
    type:         DataTypes.STRING,
    allowNull:    true,
  },
  description: {
    type:         DataTypes.TEXT,
    allowNull:    true,
  },
  isAvailable: {
    type:         DataTypes.BOOLEAN,
    allowNull:    false,
    defaultValue: true,
  },
}, {
  tableName:  'products',
  timestamps: true,
});

module.exports = Product;