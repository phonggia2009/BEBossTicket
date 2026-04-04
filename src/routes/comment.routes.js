const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { protect} = require('../middlewares/authMiddleware');

// Public route: Lấy danh sách bình luận (Ai cũng xem được)
router.get('/movie/:movieId', commentController.getMovieComments);

// Protected routes: Check quyền và Tạo bình luận (Phải đăng nhập)
router.get('/check/:movieId', protect, commentController.checkEligibility);
router.post('/', protect, commentController.createComment);

module.exports = router;