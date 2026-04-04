const seatService = require('../services/seat.service');
const sendResponse = require('../utils/responseHelper');

/**
 * @desc  Lấy tất cả ghế của 1 phòng
 * @route GET /api/seats/room/:roomId
 */
exports.getSeatsByRoom = async (req, res) => {
  try {
    const seats = await seatService.getSeatsByRoom(req.params.roomId);
    return sendResponse(res, 200, 'Lấy danh sách ghế thành công', seats);
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phòng chiếu');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

/**
 * @desc  Tạo/cập nhật toàn bộ ghế của 1 phòng (bulk upsert)
 * @route POST /api/seats/room/:roomId/bulk
 */
exports.bulkCreateSeats = async (req, res) => {
  try {
    const totalCreated = await seatService.bulkCreateSeats(req.params.roomId, req.body.seats);
    return sendResponse(res, 200, `Đã lưu ${totalCreated} ghế thành công`, {
      total: totalCreated,
    });
  } catch (error) {
    if (error.message === 'INVALID_SEAT_DATA') return sendResponse(res, 400, 'Dữ liệu ghế không hợp lệ');
    if (error.message === 'ROOM_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phòng chiếu');
    
    // Bắt lỗi từng ghế cụ thể từ hàm xử lý của Service
    if (error.message.startsWith('INVALID_SEAT_ITEM')) {
      const invalidSeatData = error.message.split('|')[1];
      return sendResponse(res, 400, `Dữ liệu ghế không hợp lệ: ${invalidSeatData}`);
    }

    return sendResponse(res, 500, 'Lỗi hệ thống khi lưu ghế', { error: error.message });
  }
};

/**
 * @desc  Xóa toàn bộ ghế của 1 phòng
 * @route DELETE /api/seats/room/:roomId
 */
exports.deleteAllSeats = async (req, res) => {
  try {
    const deletedCount = await seatService.deleteAllSeats(req.params.roomId);
    return sendResponse(res, 200, `Đã xóa ${deletedCount} ghế`, { deleted: deletedCount });
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phòng chiếu');
    return sendResponse(res, 500, 'Lỗi hệ thống khi xóa ghế', { error: error.message });
  }
};

/**
 * @desc  Cập nhật loại của 1 ghế đơn lẻ (dùng nếu cần sau này)
 * @route PATCH /api/seats/:seatId
 */
exports.updateSeat = async (req, res) => {
  try {
    const seat = await seatService.updateSeat(req.params.seatId, req.body.seat_type);
    return sendResponse(res, 200, 'Cập nhật ghế thành công', seat);
  } catch (error) {
    if (error.message === 'INVALID_SEAT_TYPE') return sendResponse(res, 400, 'Loại ghế không hợp lệ');
    if (error.message === 'SEAT_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy ghế');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};