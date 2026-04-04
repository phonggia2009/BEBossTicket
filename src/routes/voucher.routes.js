const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// 1. Kiểm tra mã giảm giá (User áp dụng lúc thanh toán)
// (Đặt trên cùng để tránh bị nhầm với các route có :id nếu có)
// Endpoint: POST /api/vouchers/check
router.post('/check', protect, voucherController.check);

// 2. Lấy danh sách tất cả mã giảm giá
// Endpoint: GET /api/vouchers
router.get('/', protect, restrictTo('ADMIN'), voucherController.getAll);

// 3. Tạo mã giảm giá mới
// Endpoint: POST /api/vouchers
router.post('/', protect, restrictTo('ADMIN'), voucherController.create);

// 4. Bật/Tắt trạng thái hoạt động của mã giảm giá
// Endpoint: PATCH /api/vouchers/:id/toggle
router.patch('/:id/toggle', protect, restrictTo('ADMIN'), voucherController.toggle);

module.exports = router;