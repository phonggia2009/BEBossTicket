require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    timezone: '+07:00', // Đã thêm: Giúp local của bạn đúng giờ Việt Nam
    dialectOptions: {
      ssl: false // Local không cần SSL
    }
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    timezone: '+07:00', // Múi giờ Việt Nam
    // ĐÃ XÓA: dateStrings và typeCast vì Postgres không hỗ trợ
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    timezone: '+07:00', // Múi giờ Việt Nam
    dialectOptions: {
      // Quan trọng: Trên Render dùng Postgres thường yêu cầu SSL bắt buộc
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};