const { DataTypes } = require('sequelize');
const sequelize = require('../config/database'); // Đổi lại đường dẫn theo project của bạn

const Voucher = sequelize.define('Voucher', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING, allowNull: false, unique: true }, // VD: TET2026, BOSS50K
  discount_type: { type: DataTypes.ENUM('PERCENTAGE', 'FIXED'), allowNull: false },
  discount_value: { type: DataTypes.INTEGER, allowNull: false }, 
  max_discount: { type: DataTypes.INTEGER, allowNull: true }, // Giảm tối đa (nếu là PERCENTAGE)
  min_order_value: { type: DataTypes.INTEGER, defaultValue: 0 }, 
  usage_limit: { type: DataTypes.INTEGER, defaultValue: 100 }, 
  used_count: { type: DataTypes.INTEGER, defaultValue: 0 }, 
  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  title: { 
    type: DataTypes.STRING, 
    allowNull: false 
  },
  description: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  image: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
  tag: { 
    type: DataTypes.STRING, 
    allowNull: true 
  },
}, {
  tableName: 'vouchers',
  timestamps: true
});

module.exports = Voucher;