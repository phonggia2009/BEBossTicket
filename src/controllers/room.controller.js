const roomService = require('../services/room.service');
const sendResponse = require('../utils/responseHelper');

exports.createRoom = async (req, res) => {
  try {
    const room = await roomService.createRoom(req.body);
    return sendResponse(res, 201, 'Tạo phòng chiếu thành công', { room });
  } catch (error) {
    if (error.message === 'CINEMA_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy rạp');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.getAllRooms = async (req, res) => {
  try {
    const rooms = await roomService.getAllRooms();
    return sendResponse(res, 200, 'Lấy danh sách phòng thành công', { rooms });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.getRoomsByCinema = async (req, res) => {
  try {
    const rooms = await roomService.getRoomsByCinema(req.params.cinemaId);
    return sendResponse(res, 200, 'Lấy danh sách phòng theo rạp thành công', { rooms });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const updatedRoom = await roomService.updateRoom(req.params.id, req.body);
    return sendResponse(res, 200, 'Cập nhật phòng thành công', { room: updatedRoom });
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy phòng để cập nhật');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    await roomService.deleteRoom(req.params.id);
    return sendResponse(res, 200, 'Xóa phòng thành công');
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy phòng để xóa');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};