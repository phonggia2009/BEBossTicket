const express = require('express');
const router = express.Router();
const voucherController = require('../controllers/voucher.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const uploadCloud = require('../config/cloudinary'); 
const uploadFields = uploadCloud.fields([{ name: 'image', maxCount: 1 }]);
router.post('/check', protect, voucherController.check);
router.get('/active'    , voucherController.getActive);
router.get('/', protect, restrictTo('ADMIN'), voucherController.getAll);

// Áp dụng middleware uploadCloud
router.post(
  '/',
  protect,
  restrictTo('ADMIN'),
  uploadFields, // ✅ Dùng uploadFields đã được cấu hình
  voucherController.create
);

router.patch('/:id/toggle', protect, restrictTo('ADMIN'), voucherController.toggle);

module.exports = router;