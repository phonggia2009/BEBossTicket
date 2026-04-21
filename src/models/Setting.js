const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); 

const Setting = sequelize.define('Setting', {
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