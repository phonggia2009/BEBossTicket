require('dotenv').config();
const http = require('http'); // 1. Thêm module http có sẵn của Node.js
const app = require('./src/app'); 
const sequelize = require('./src/config/database'); 
const socketUtil = require('./src/utils/socket'); // 2. Import file socket bạn vừa tạo

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối Database thành công!');

    await sequelize.sync({ force: false }); 
    
    const server = http.createServer(app);
    
    socketUtil.init(server);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server đang chạy tại: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Không thể kết nối Database:', error);
  }
};

startServer();