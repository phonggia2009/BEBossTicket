const cron = require('node-cron');
const bookingService = require('../services/booking.service');

// Chạy mỗi 15 phút
const startBookingCron = () => {
   bookingService.expireBookingsByShowtime().then(r => 
    console.log('[CRON TEST] Kết quả ngay lúc start:', r)
  );
  cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Kiểm tra booking hết hạn theo suất chiếu...');
    try {
      const result = await bookingService.expireBookingsByShowtime();
      if (result.updated > 0) {
        console.log(`[CRON] Đã cập nhật ${result.updated} booking`);
      }
    } catch (err) {
      console.error('[CRON] Lỗi:', err.message);
    }
  });

  console.log('[CRON] Booking expiry cron đã khởi động');
};

module.exports = { startBookingCron };