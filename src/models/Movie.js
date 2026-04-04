const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Movie = sequelize.define('Movie', {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: DataTypes.TEXT,
  releaseDate: DataTypes.DATEONLY,
  posterUrl: DataTypes.STRING,
  trailerUrl: { 
    type: DataTypes.STRING 
  },
  banners: { 
    type: DataTypes.JSONB, 
    defaultValue: []
  },
  // --- CẬP NHẬT MỚI ---
  duration: {
    type: DataTypes.INTEGER, // Lưu thời lượng theo phút (ví dụ: 120)
    allowNull: true,
    validate: {
      min: 1 // Thời lượng không thể là số âm hoặc bằng 0
    }
  },
  rating: {
    type: DataTypes.FLOAT, // Lưu điểm đánh giá (ví dụ: 8.5)
    allowNull: true,
    validate: {
      min: 0,
      max: 10 // Giới hạn thang điểm từ 0 đến 10
    }
  }
}, {
  paranoid: true, // Hỗ trợ xóa mềm (Soft Delete)
  timestamps: true,
});

module.exports = Movie;