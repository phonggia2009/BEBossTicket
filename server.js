require('dotenv').config();
const http = require('http');
const app = require('./src/app'); 
const sequelize = require('./src/config/database'); 
const socketUtil = require('./src/utils/socket');

const startServer = async () => {
  try {
    // 🔍 Log để kiểm tra ENV (rất quan trọng khi deploy)
    console.log("ENV:", process.env.NODE_ENV);
    console.log("DB URL:", process.env.DATABASE_URL ? "✔ Có" : "❌ Không có");

    // 🔌 Test kết nối DB
    await sequelize.authenticate();
    console.log('✅ Kết nối Database thành công!');

    // 🛠️ Tạo bảng nếu chưa có
    await sequelize.sync({ alter: true }); 
    console.log('📦 Đồng bộ database thành công!');

    // 🌐 Tạo server
    const server = http.createServer(app);

    // 🔌 Socket
    socketUtil.init(server);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại: ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Không thể kết nối Database:', error);

    // ❗ Thoát process để Render restart lại (quan trọng)
    process.exit(1);
  }
};

startServer();