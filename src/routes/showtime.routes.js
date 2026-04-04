const express = require('express');
const router = express.Router();
const showtimeController = require('../controllers/showtime.controller');
// GET /api/showtimes - Lấy tất cả lịch chiếu (có filter)
router.get('/', showtimeController.getShowtimes);
// GET /api/showtimes/:id - Lấy chi tiết lịch chiếu
router.get('/:id', showtimeController.getShowtimeById);

// POST /api/showtimes - Tạo lịch chiếu mới
router.post('/', showtimeController.createShowtime);

// PUT /api/showtimes/:id - Cập nhật lịch chiếu
router.put('/:id', showtimeController.updateShowtime);

// DELETE /api/showtimes/:id - Xóa lịch chiếu
router.delete('/:id', showtimeController.deleteShowtime);

// GET /api/showtimes/movie/:movieId - Lịch chiếu theo phim
router.get('/movie/:movieId', showtimeController.getShowtimesByMovie);

// GET /api/showtimes/room/:roomId - Lịch chiếu theo phòng
router.get('/room/:roomId', showtimeController.getShowtimesByRoom);

// GET /api/showtimes/check-conflict - Kiểm tra xung đột lịch
router.post('/check-conflict', showtimeController.checkConflict);

module.exports = router;