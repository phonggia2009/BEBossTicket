const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// ==========================================
// 1. CÁC ROUTE CÁ NHÂN (STATIC) 
// ==========================================
router.get('/profile', protect, userController.getProfile);
router.patch('/profile', protect, userController.updateProfile);
router.get('/my-history', protect, userController.getMyPointHistory);

// ==========================================
// 2. CÁC ROUTE CỦA ADMIN (STATIC & SPECIFIC)
// Đặt trước các route /:id để không bị nuốt
// ==========================================
router.get('/', protect, restrictTo('ADMIN'), userController.getAllUsers); 
router.get('/admin/history', protect, restrictTo('ADMIN'), userController.getAllPointHistoryAdmin);
router.post('/admin/:id/adjust-points', protect, restrictTo('ADMIN'), userController.adjustPointsAdmin);
router.get('/admin/:id/point-history', protect, restrictTo('ADMIN'), userController.getPointHistoryAdmin);

// ==========================================
// 3. CÁC ROUTE DYNAMIC (Có chứa tham số /:id chung chung)
// BẮT BUỘC ĐẶT CUỐI CÙNG
// ==========================================
router.get('/:id', protect, restrictTo('ADMIN'), userController.getUserById); 
router.patch('/:id/role', protect, restrictTo('ADMIN'), userController.updateUserRole);
router.delete('/:id', protect, restrictTo('ADMIN'), userController.deleteUser);

module.exports = router;