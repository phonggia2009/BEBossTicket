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
total_price: { type: DataTypes.INTEGER, allowNull: false },  // giữ INTEGER
  status: {
    type: DataTypes.ENUM('PENDING', 'SUCCESS', 'CANCELLED','USED'),
    defaultValue: 'PENDING'   // PENDING: Đang chờ thanh toán
  },
  // Dùng duy nhất booking_time, bỏ created_at trùng lặp
  booking_time: { 
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  voucher_id: {
    type: DataTypes.INTEGER,
    allowNull: true, // Cho phép null vì không phải ai cũng dùng mã
  },
  discount_amount: {
    type: DataTypes.INTEGER,
    defaultValue: 0, // Mặc định là giảm 0 đồng
  },
  points_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0, // Mặc định là không dùng điểm
},
points_earned: {
  type: DataTypes.INTEGER,
  defaultValue: 0 // Mặc định là không tích điểm
},
  tableName: 'bookings',
  timestamps: false
});

module.exports = Booking;