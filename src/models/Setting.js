const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 

const Setting = sequelize.define('Setting', {
  moneyToPointRate: DataTypes.INTEGER,
  pointToMoneyRate: DataTypes.INTEGER,
  maintenanceMode: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: false 
  },
  bannerMovies: { 
    type: DataTypes.JSON, 
    defaultValue: [] 
  }
}, {
  tableName: 'Settings', // Tên bảng trong database
  timestamps: true       // Tự động tạo createdAt, updatedAt
});

module.exports = Setting;