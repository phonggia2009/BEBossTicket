const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Thay thế multer mặc định bằng cấu hình Cloudinary của dự án
const uploadCloud = require('../config/cloudinary'); 

router.post('/check', protect, voucherController.check);
router.get('/active'    , voucherController.getActive);
router.get('/', protect, restrictTo('ADMIN'), voucherController.getAll);

// Áp dụng middleware uploadCloud
router.post(
  '/',
  protect,
  restrictTo('ADMIN'),
  uploadCloud.fields([{ name: 'image', maxCount: 1 }]), // ✅ Dùng uploadCloud
  voucherController.create
);

router.patch('/:id/toggle', protect, restrictTo('ADMIN'), voucherController.toggle);

module.exports = router;