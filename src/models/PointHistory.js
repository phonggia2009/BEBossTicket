const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PointHistory = sequelize.define('PointHistory', {
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  change_amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  balance_after: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: true,
  updatedAt: false // Chỉ cần lưu thời điểm tạo
});

module.exports = PointHistory;