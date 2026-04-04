const cinemaService = require('../services/cinema.service');
const sendResponse = require('../utils/responseHelper');

exports.createCinema = async (req, res) => {
  try {
    const cinema = await cinemaService.createCinema(req.body);
    return sendResponse(res, 201, 'Tạo rạp thành công', { cinema });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi tạo rạp', { error: error.message });
  }
};

exports.getAllCinemas = async (req, res) => {
  try {
    const cinemas = await cinemaService.getAllCinemas();
    return sendResponse(res, 200, 'Lấy danh sách rạp thành công', { cinemas });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi lấy danh sách', { error: error.message });
  }
};

exports.getCinemaById = async (req, res) => {
  try {
    const cinema = await cinemaService.getCinemaById(req.params.id);
    return sendResponse(res, 200, 'Lấy thông tin rạp thành công', { cinema });
  } catch (error) {
    if (error.message === 'CINEMA_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy rạp');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.updateCinema = async (req, res) => {
  try {
    const updatedCinema = await cinemaService.updateCinema(req.params.id, req.body);
    return sendResponse(res, 200, 'Cập nhật rạp thành công', { cinema: updatedCinema });
  } catch (error) {
    if (error.message === 'CINEMA_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy rạp để cập nhật');
    }
    return sendResponse(res, 500, 'Lỗi cập nhật', { error: error.message });
  }
};

exports.deleteCinema = async (req, res) => {
  try {
    await cinemaService.deleteCinema(req.params.id);
    return sendResponse(res, 200, 'Xóa rạp thành công');
  } catch (error) {
    if (error.message === 'CINEMA_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy rạp để xóa');
    }
    return sendResponse(res, 500, 'Lỗi khi xóa', { error: error.message });
  }
};

exports.searchCinemas = async (req, res) => {
  try {
    const { query } = req.query; 
    const cinemas = await cinemaService.searchCinemas(query);
    return sendResponse(res, 200, 'Kết quả tìm kiếm', { cinemas });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi tìm kiếm', { error: error.message });
  }
};