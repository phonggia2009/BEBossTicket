// routes/seatRoutes.js
const express = require('express');
const router = express.Router();
const seatController = require('../controllers/seat.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');
// Nếu middleware của bạn tên khác thì đổi lại cho phù hợp

// ── Public (User xem ghế khi đặt vé) ──────────────────────────────
router.get('/room/:roomId', seatController.getSeatsByRoom);

// ── Admin only ─────────────────────────────────────────────────────
router.post(
  '/room/:roomId/bulk',
  protect,
  restrictTo('ADMIN'),
  seatController.bulkCreateSeats
);

router.delete(
  '/room/:roomId',
  protect,
  restrictTo('ADMIN'),
  seatController.deleteAllSeats
);

router.patch(
  '/:seatId',
  protect,
  restrictTo('ADMIN'),
  seatController.updateSeat
);

module.exports = router;