const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// ─── Public routes (VNPay gọi vào, không cần auth) ───────────────────────────
// Phải đặt TRƯỚC /:id để tránh bị nuốt vào param route

// ─── Admin routes (có auth + role check) ─────────────────────────────────
router.get('/admin', protect,restrictTo('ADMIN'), bookingController.getAllBookingsAdmin);

// 2. Lấy chi tiết
router.get('/admin/:id', protect,restrictTo('ADMIN'), bookingController.getBookingDetailAdmin);

// 3. Ép hủy đơn
router.put('/admin/:id/cancel', protect,restrictTo('ADMIN'), bookingController.forceCancelBooking);

// 4. Đổi trạng thái tự do (nếu lỗi hệ thống/hoàn tiền tay)
router.patch('/admin/:id/status', protect,restrictTo('ADMIN'), bookingController.updateBookingStatus);
// ─── Protected routes ─────────────────────────────────────────────────────────
router.post('/',         protect, bookingController.createBooking);
router.get('/my-bookings', protect, bookingController.getMyBookings);
router.get('/:id',       protect, bookingController.getBookingById);
router.patch('/:id/cancel', protect, bookingController.cancelMyBooking);

// Thêm vào phần route của Admin/Staff
router.post('/admin/checkin', protect, restrictTo('ADMIN'), bookingController.checkInTicket);

module.exports = router;