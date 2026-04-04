const movieService = require('../services/movie.service');
const sendResponse = require('../utils/responseHelper');

exports.getSuggestedVideos = async (req, res) => {
  try {
    const movies = await movieService.getSuggestedVideos();
    return sendResponse(res, 200, 'Lấy danh sách video gợi ý thành công', movies);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.getMovieList = async (req, res) => {
  try {
    // Lấy page, limit và status từ query string 
    // (ví dụ: /api/movies?page=1&limit=10&status=now-showing)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10; // Nên để mặc định 10 cho trang phim
    const status = req.query.status; // Lấy thêm tham số status

    // Truyền status xuống service
    const result = await movieService.getMovies(page, limit, status);

    // Trả về dữ liệu cho Frontend
    res.status(200).json({
      success: true,
      data: result.movies,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMovieDetail = async (req, res) => {
  try {
    const movie = await movieService.getMovieDetail(req.params.id); // Gọi hàm từ service
    return sendResponse(res, 200, 'Lấy chi tiết phim thành công', { movie }); // Trả về dữ liệu phim
  } catch (error) {
    // Xử lý trường hợp không tìm thấy phim
    if (error.message === 'MOVIE_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy phim');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.searchMovies = async (req, res) => {
  try {
    const movies = await movieService.searchMovies(req.query.query);
    return sendResponse(res, 200, `Tìm thấy ${movies.length} bộ phim`, { movies });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi khi tìm kiếm', { error: error.message });
  }
};

exports.createMovie = async (req, res) => {
  try {
    const movieWithGenres = await movieService.createMovie(req.body, req.files);
    return sendResponse(res, 201, 'Thêm phim thành công', { movie: movieWithGenres });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.updateMovie = async (req, res) => {
  try {
    const updatedMovie = await movieService.updateMovie(req.params.id, req.body, req.files);
    return sendResponse(res, 200, 'Cập nhật phim thành công', { movie: updatedMovie });
  } catch (error) {
    if (error.message === 'MOVIE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phim');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.assignGenres = async (req, res) => {
  try {
    const updatedMovie = await movieService.assignGenres(req.params.id, req.body.genreIds);
    return sendResponse(res, 200, 'Gán thể loại thành công', { movie: updatedMovie });
  } catch (error) {
    if (error.message === 'MOVIE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phim');
    if (error.message === 'INVALID_GENRE_FORMAT') return sendResponse(res, 400, 'genreIds phải là mảng');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.deleteMovie = async (req, res) => {
  try {
    await movieService.deleteMovie(req.params.id);
    return sendResponse(res, 200, 'Đã đưa phim vào thùng rác');
  } catch (error) {
    if (error.message === 'MOVIE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phim');
    
    // Bắt lỗi lịch chiếu và trả về status 400 (Bad Request)
    if (error.message === 'MOVIE_HAS_ACTIVE_SHOWTIMES') {
      return sendResponse(res, 400, 'Không thể xóa! Phim này đang có lịch chiếu sắp tới.');
    }
    
    return sendResponse(res, 500, 'Lỗi khi xóa', { error: error.message });
  }
};
exports.getTrash = async (req, res) => {
  try {
    const deletedMovies = await movieService.getTrash();
    return sendResponse(res, 200, 'Danh sách thùng rác', { deletedMovies });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi server', { error: error.message });
  }
};

exports.restoreMovie = async (req, res) => {
  try {
    const movie = await movieService.restoreMovie(req.params.id);
    return sendResponse(res, 200, 'Khôi phục thành công', { movie });
  } catch (error) {
    if (error.message === 'MOVIE_NOT_IN_TRASH') return sendResponse(res, 404, 'Không thấy trong thùng rác');
    return sendResponse(res, 500, 'Lỗi khôi phục', { error: error.message });
  }
};

exports.getPersonalizedSuggestions = async (req, res) => {
  try {
    const userId = req.user?.id; // Lấy userId từ token (middleware)
    
    // Nếu có đăng nhập, gọi hàm cá nhân hóa. Nếu khách vãng lai, gọi random.
    const movies = userId 
      ? await movieService.getPersonalizedMovies(userId)
      : await movieService.getSuggestedVideos();

    return sendResponse(res, 200, 'Lấy video gợi ý cá nhân hóa thành công', movies);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};