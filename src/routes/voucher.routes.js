const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

const { uploadCloud } = require('../config/cloudinary');
const uploadFields = uploadCloud.fields([
  { name: 'image', maxCount: 1 } // Chỉ cần upload 1 ảnh cho voucher
]);

// Endpoint: POST /api/vouchers/check
router.post('/check', protect, voucherController.check);
router.get('/active', voucherController.getActive);

// 2. Lấy danh sách tất cả mã giảm giá
// Endpoint: GET /api/vouchers
router.get('/', protect, restrictTo('ADMIN'), voucherController.getAll);

// 3. Tạo mã giảm giá mới
// Endpoint: POST /api/vouchers
router.post(
  '/',
  protect,
  restrictTo('ADMIN'),
  uploadFields, // ✅ Sử dụng uploadFields ở đây
  voucherController.create
);

// 4. Bật/Tắt trạng thái hoạt động của mã giảm giá
// Endpoint: PATCH /api/vouchers/:id/toggle
router.patch('/:id/toggle', protect, restrictTo('ADMIN'), voucherController.toggle);

module.exports = router;