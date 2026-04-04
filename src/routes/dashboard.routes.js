const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Route này chỉ Admin mới được truy cập
router.get('/', protect, restrictTo('ADMIN'), dashboardController.getStats);

module.exports = router;