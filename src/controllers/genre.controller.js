const genreService = require('../services/genre.service');
const sendResponse = require('../utils/responseHelper');

exports.getAllGenres = async (req, res) => {
  try {
    const genres = await genreService.getAllGenres();
    return sendResponse(res, 200, 'Lấy danh sách thể loại thành công', { genres });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.createGenre = async (req, res) => {
  try {
    const { name } = req.body;
    const newGenre = await genreService.createGenre(name);
    return sendResponse(res, 201, 'Thêm thể loại thành công', { genre: newGenre });
  } catch (error) {
    return sendResponse(res, 400, 'Dữ liệu không hợp lệ', { error: error.message });
  }
};

exports.updateGenre = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const genre = await genreService.updateGenre(id, name);
    return sendResponse(res, 200, 'Cập nhật thành công', { genre });
  } catch (error) {
    if (error.message === 'GENRE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy thể loại');
    return sendResponse(res, 400, 'Lỗi khi cập nhật', { error: error.message });
  }
};

exports.deleteGenre = async (req, res) => {
  try {
    await genreService.deleteGenre(req.params.id);
    return sendResponse(res, 200, 'Xóa thể loại thành công');
  } catch (error) {
    if (error.message === 'GENRE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy thể loại');
    return sendResponse(res, 500, 'Lỗi khi xóa', { error: error.message });
  }
};