require('dotenv').config();

process.env.TZ = 'Asia/Ho_Chi_Minh';

Date.prototype.toJSON = function () {
  const tzOffset = this.getTimezoneOffset() * 60000; // Độ lệch múi giờ
  const localTime = new Date(this.getTime() - tzOffset);
  return localTime.toISOString().slice(0, 19).replace('T', ' '); 
};

const http = require('http');
const app = require('./src/app'); 
const sequelize = require('./src/config/database'); 
const socketUtil = require('./src/utils/socket');
const { startBookingCron } = require('./src/cron/bookingCron');
require('./src/models');

const startServer = async () => {
  try {
    console.log("-----------------------------------------");
    console.log("Môi trường:", process.env.NODE_ENV || 'development');
    console.log("DB URL:", process.env.DATABASE_URL ? "✔ Đã cấu hình" : "❌ Chưa cấu hình (Dùng Local)");
    
    // 1. Kiểm tra kết nối
    await sequelize.authenticate();
    console.log('✅ Kết nối Database thành công');

    // 2. Đồng bộ Database an toàn
    if (process.env.NODE_ENV === 'production') {
      await sequelize.sync(); 
      console.log('📦 DB synced (Production Mode - Safe)');
    } else {
      // Ở Local, cho phép alter để code cho nhanh
      await sequelize.sync({ alter: true });
      console.log('📦 DB synced (Development Mode - Alter)');
    }
    
    // 3. Khởi động các tiến trình ngầm (Cronjob)
    startBookingCron();   
    
    // 4. Khởi động HTTP & Socket Server
    const server = http.createServer(app);
    socketUtil.init(server);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server running at PORT: ${PORT}`);
      console.log(`🕒 Timezone hệ thống: ${process.env.TZ}`);
      console.log("-----------------------------------------");
    });

  } catch (error) {
    console.error('❌ Lỗi khởi động Server (DB Error):', error);
    process.exit(1); // Thoát tiến trình ngay nếu DB lỗi để tránh app chạy sai
  }
};

startServer();
