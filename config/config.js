require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    dialectOptions: {
      ssl: false // Nếu dùng Postgres local thì để false
    }
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
     timezone: '+07:00', // Đặt múi giờ Việt Nam (+7)
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    dialect: 'postgres',
    timezone: '+07:00', // Đặt múi giờ Việt Nam (+7)
    dialectOptions: {
      dateStrings: true,
      typeCast: true,
    },
  }
};