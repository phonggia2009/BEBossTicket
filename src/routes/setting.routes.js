const express = require('express');
const router = express.Router();
const settingController = require('../controllers/setting.controller');

// 1. IMPORT ĐÚNG TÊN HÀM TỪ AUTH MIDDLEWARE CỦA BẠN
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Route Get không cần bảo mật (ai cũng xem được để biết web có đang bảo trì không)
router.get('/', settingController.getSettings);


router.put('/', protect, restrictTo('ADMIN'), settingController.updateSettings);

module.exports = router;