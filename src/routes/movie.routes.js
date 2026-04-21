// src/routes/movie.routes.js

const express = require('express');
const router = express.Router();
const movieController = require('../controllers/movie.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
const { uploadCloud } = require('../config/cloudinary');
const uploadFields = uploadCloud.fields([
  { name: 'image', maxCount: 1 },
  { name: 'banners', maxCount: 3 }
]);

// Công khai: Xem phim
router.get('/suggested-videos', movieController.getSuggestedVideos);
router.get('/', movieController.getMovieList);
router.get('/search', movieController.searchMovies);
router.get('/personalized-suggestions', protect, movieController.getPersonalizedSuggestions);
router.get('/trash', protect, restrictTo('ADMIN'), movieController.getTrash);

// Cụm route có chứa :id đặt xuống dưới
router.get('/:id', movieController.getMovieDetail);
router.post('/', protect, restrictTo('ADMIN'), uploadFields, movieController.createMovie);
router.delete('/:id', protect, restrictTo('ADMIN'), movieController.deleteMovie);
router.post('/:id/genres', protect, restrictTo('ADMIN'), movieController.assignGenres);
router.patch('/restore/:id', protect, restrictTo('ADMIN'), movieController.restoreMovie);
router.put('/:id', protect, restrictTo('ADMIN'), uploadFields, movieController.updateMovie);

module.exports = router;