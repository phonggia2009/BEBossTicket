const { Sequelize } = require('sequelize');
const configs = require('../../config/config');

const env = process.env.NODE_ENV || 'development';
const config = configs[env];

let sequelize;

// 👉 Nếu có DATABASE_URL (production - Render)
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  });
} else {
  // 👉 Local (giữ nguyên như bạn đang dùng)
  sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    {
      host: config.host,
      port: config.port,
      dialect: config.dialect,
      logging: false,
      dialectOptions: config.dialectOptions,
    }
  );
}

module.exports = sequelize;