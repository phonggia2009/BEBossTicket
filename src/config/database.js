const { Sequelize } = require('sequelize');
const configs = require('../../config/config');

// Lấy cấu hình của môi trường hiện tại (mặc định là development)
const env = process.env.NODE_ENV || 'development';
const config = configs[env];

// Khởi tạo đối tượng Sequelize duy nhất cho toàn bộ App
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: false,
    dialectOptions: config.dialectOptions
  }
);

module.exports = sequelize;