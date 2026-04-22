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

   cron.schedule('*/15 * * * *', async () => {
    console.log('[CRON] Kiểm tra booking SUCCESS cần chuyển sang NO_SHOW...');
    try {
      const result = await bookingService.expireSuccessBookings();
      if (result.updated > 0) {
        console.log(`[CRON] Đã chuyển ${result.updated} booking SUCCESS → NO_SHOW cho các suất chiếu đã kết thúc mà không sử dụng`);
      }
    } catch (err) {
      console.error('[CRON] Lỗi expire SUCCESS:', err.message);
    }
  });

  cron.schedule('*/5 * * * *', async () => {
    console.log('[CRON] Kiểm tra gửi mail nhắc nhở suất chiếu...');
    try {
      const sentCount = await bookingService.sendShowtimeReminders();
      if (sentCount > 0) {
        console.log(`[CRON] Đã gửi ${sentCount} email nhắc nhở suất chiếu.`);
      }
    } catch (err) {
      console.error('[CRON] Lỗi gửi mail nhắc nhở:', err.message);
    }
  });
  console.log('[CRON] Hệ thống Cron Job đã khởi động');
};

module.exports = { startBookingCron };