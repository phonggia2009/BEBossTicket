const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');

// Lấy tất cả phòng
router.get('/', roomController.getAllRooms);

// Lấy các phòng thuộc 1 rạp cụ thể
router.get('/cinema/:cinemaId', roomController.getRoomsByCinema);

// Tạo phòng mới
router.post('/', roomController.createRoom);

// Cập nhật và Xóa
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

module.exports = router;