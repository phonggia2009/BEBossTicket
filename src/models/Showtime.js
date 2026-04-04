const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Showtime = sequelize.define('Showtime', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // room_id và movie_id được quản lý bởi Association trong models/index.js
  start_time: {
    type: DataTypes.DATE,
    allowNull: false,
    validate: {
      // Dùng custom validator thay vì isAfter tĩnh
      // để đảm bảo kiểm tra đúng thời điểm tạo, không phải lúc app khởi động
      isInFuture(value) {
        if (new Date(value) <= new Date()) {
          throw new Error('Suất chiếu phải được tạo ở thời điểm tương lai');
        }
      }
    }
  },
  room_id: {
  type: DataTypes.INTEGER,
  allowNull: false
  },
  movie_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'Showtimes',
  paranoid: true,
  timestamps: true
});

module.exports = Showtime;