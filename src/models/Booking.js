const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Booking = sequelize.define('Booking', {
  booking_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  showtime_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_price: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'SUCCESS', 'CANCELLED','USED', 'NO_SHOW'),
    defaultValue: 'PENDING'
  },
  booking_time: { 
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  voucher_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  discount_amount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  points_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  points_earned: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isReminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Đánh dấu đã gửi mail nhắc trước giờ chiếu hay chưa'
    }
}, {
  tableName: 'bookings',     // ✅ ĐÚNG CHỖ
  freezeTableName: true,
  timestamps: false
});

module.exports = Booking;