const express = require('express');
const router = express.Router();
const genreController = require('../controllers/genre.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

// Ai cũng có thể xem danh sách thể loại để lọc phim
router.get('/', genreController.getAllGenres);

// Chỉ Admin mới có quyền thay đổi danh mục
router.post('/', protect, restrictTo('ADMIN'), genreController.createGenre);
router.put('/:id', protect, restrictTo('ADMIN'), genreController.updateGenre);
router.delete('/:id', protect, restrictTo('ADMIN'), genreController.deleteGenre);

module.exports = router;