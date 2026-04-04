// routes/productRoutes.js
const express = require('express');
const router = express.Router();

const productController = require('../controllers/product.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { uploadCloud } = require('../config/cloudinary');

// Upload 1 ảnh cho product
const uploadImage = uploadCloud.fields([
  { name: 'image', maxCount: 1 }
]);

// ================= PUBLIC =================
// Client xem danh sách sản phẩm
router.get('/', productController.getProducts);
router.get('/:id', productController.getProductById);

// ================= ADMIN =================
router.post(
  '/',
  protect,
  restrictTo('ADMIN'),
  uploadImage,
  productController.createProduct
);

router.put(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  uploadImage,
  productController.updateProduct
);

router.delete(
  '/:id',
  protect,
  restrictTo('ADMIN'),
  productController.deleteProduct
);

// Cập nhật tồn kho
router.patch(
  '/:id/stock',
  protect,
  restrictTo('ADMIN'),
  productController.updateStock
);

// Bật/tắt sản phẩm
router.patch(
  '/:id/toggle',
  protect,
  restrictTo('ADMIN'),
  productController.toggleAvailability
);

module.exports = router;