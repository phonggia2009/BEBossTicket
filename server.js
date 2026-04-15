require('dotenv').config();
const http = require('http');
const app = require('./src/app'); 
const sequelize = require('./src/config/database'); 
const socketUtil = require('./src/utils/socket');

require('./src/models');

const startServer = async () => {
  try {
    console.log("DB URL:", process.env.DATABASE_URL ? "✔ Có" : "❌ Không có");

    await sequelize.authenticate();
    console.log('✅ DB connected');

    // 👉 sync trước khi làm gì khác
    await sequelize.sync({ alter: true });
    console.log('📦 DB synced');

    // 👉 chỉ start server sau khi DB OK
    const server = http.createServer(app);
    socketUtil.init(server);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server running at ${PORT}`);
    });

  } catch (error) {
    console.error('❌ DB Error:', error);
    process.exit(1);
  }
};

startServer();