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
    console.log("DB URL:", process.env.DATABASE_URL ? "✔ Có" : "❌ Không có");

    await sequelize.authenticate();
    console.log('✅ DB connected');

    // 👉 sync trước khi làm gì khác
    await sequelize.sync({ alter: true });
    console.log('📦 DB synced');
    
    startBookingCron();   
    
    // 👉 chỉ start server sau khi DB OK
    const server = http.createServer(app);
    socketUtil.init(server);

    const PORT = process.env.PORT || 5000;

    server.listen(PORT, () => {
      console.log(`🚀 Server running at ${PORT} - Múi giờ: ${process.env.TZ}`);
    });

  } catch (error) {
    console.error('❌ DB Error:', error);
    process.exit(1);
  }
};

startServer();