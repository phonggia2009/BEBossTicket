const express = require('express');
const router = express.Router();
const cinemaController = require('../controllers/cinema.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
// 1. Tìm kiếm rạp (Đặt trên cùng để tránh bị nhầm với :id)
// Endpoint: GET /api/cinemas/search?query=...
router.get('/search', cinemaController.searchCinemas);
// 2. Lấy danh sách tất cả các rạp
// Endpoint: GET /api/cinemas
router.get('/', cinemaController.getAllCinemas);
// 3. Lấy thông tin chi tiết một rạp theo ID
// Endpoint: GET /api/cinemas/:id
router.get('/:id', cinemaController.getCinemaById);
// 4. Tạo rạp mới
// Endpoint: POST /api/cinemas
router.post('/',protect,restrictTo('ADMIN'), cinemaController.createCinema);
// 5. Cập nhật thông tin rạp
// Endpoint: PUT /api/cinemas/:id
router.put('/:id',protect,restrictTo('ADMIN'), cinemaController.updateCinema);
// 6. Xóa rạp
// Endpoint: DELETE /api/cinemas/:id
router.delete('/:id',protect,restrictTo('ADMIN'), cinemaController.deleteCinema);
module.exports = router;