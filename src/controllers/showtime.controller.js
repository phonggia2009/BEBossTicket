const showtimeService = require('../services/showtime.service');
const sendResponse = require('../utils/responseHelper');
const { Showtime, Movie, Room, Cinema, Seat, Ticket,ShowtimePrice } = require('../models');
exports.getShowtimes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    
    const filters = {
      movieId: req.query.movieId,
      roomId: req.query.roomId,
      cinemaId: req.query.cinemaId,
      date: req.query.date
    };

    const data = await showtimeService.getShowtimes(page, limit, filters);
    return sendResponse(res, 200, 'Lấy danh sách lịch chiếu thành công', data);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi lấy danh sách lịch chiếu', { error: error.message });
  }
};
exports.getShowtimeById = async (req, res) => {
  try {
    const showtime = await Showtime.findByPk(req.params.id, {
      include: [
        {
          model: Movie,
          as: 'movie',
          attributes: ['title', 'posterUrl', 'duration', 'releaseDate'] 
        },
        {
          model: Room,
          as: 'room',
          include: [
            {
              model: Cinema,
              as: 'cinema',
              attributes: ['cinema_name']
            },
            {
              model: Seat,
              as: 'seats', 
            }
          ]
        },
        {
          model: Ticket,
          as: 'tickets', 
          attributes: ['seat_id'],
          // 👇 THÊM ĐOẠN NÀY ĐỂ LỌC VÉ ĐÃ HỦY 👇
          where: {
            status: 'BOOKED' // Chỉ lấy những vé đang được giữ/đã bán
          },
          required: false // Bắt buộc phải có để thành LEFT JOIN (nếu không suất chiếu chưa có vé sẽ bị lỗi 404)
        },
        {
          model: ShowtimePrice,
          as: 'seat_prices'
        }
      ]
    });

    if (!showtime) {
      return res.status(404).json({
        code: 404,
        status: 'error',
        message: 'Không tìm thấy lịch chiếu'
      });
    }

    return res.status(200).json({
      code: 200,
      status: 'success',
      message: 'Lấy chi tiết lịch chiếu thành công',
      data: { showtime }
    });

  } catch (error) {
    console.error("Lỗi getShowtimeById:", error);
    return res.status(500).json({
      code: 500,
      status: 'error',
      message: 'Lỗi server khi lấy chi tiết lịch chiếu',
      error: error.message
    });
  }
};


exports.getShowtimesByMovie = async (req, res) => {
  try {
    const { movieId } = req.params;
    const { date } = req.query; // Lấy ngày từ query string

    const showtimes = await showtimeService.getShowtimesByMovie(movieId, date);

    return sendResponse(res, 200, 'Lấy lịch chiếu theo phim và ngày thành công', { showtimes });
  } catch (error) {
    if (error.message === 'MOVIE_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy phim');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.createShowtime = async (req, res) => {
  try {
    const showtime = await showtimeService.createShowtime(req.body);
    // Đoạn code cache của bạn đã bị bỏ do không hoạt động
    return sendResponse(res, 201, 'Tạo lịch chiếu và giá vé thành công', { showtime });
  } catch (error) {
    if (error.message === 'MISSING_PRICES') return sendResponse(res, 400, 'Vui lòng cung cấp danh sách giá vé cho từng loại ghế');
    if (error.message === 'MOVIE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phim');
    
    // BẮT LỖI TẠI ĐÂY
    if (error.message === 'INVALID_START_TIME') {
      return sendResponse(res, 400, 'Ngày tạo lịch chiếu không được diễn ra trước ngày khởi chiếu của bộ phim!');
    }
    
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.updateShowtime = async (req, res) => {
  try {
    const showtime = await showtimeService.updateShowtime(req.params.id, req.body);
    return sendResponse(res, 200, 'Cập nhật thành công', { showtime });
  } catch (error) {
    if (error.message === 'SHOWTIME_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy lịch chiếu');
    if (error.message === 'MOVIE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phim');
    
    // BẮT LỖI TẠI ĐÂY
    if (error.message === 'INVALID_START_TIME') {
      return sendResponse(res, 400, 'Ngày tạo lịch chiếu không được diễn ra trước ngày khởi chiếu của bộ phim!');
    }

    return sendResponse(res, 500, 'Lỗi cập nhật', { error: error.message });
  }
};
exports.updateShowtime = async (req, res) => {
  try {
    const showtime = await showtimeService.updateShowtime(req.params.id, req.body);
    return sendResponse(res, 200, 'Cập nhật thành công', { showtime });
  } catch (error) {
    if (error.message === 'SHOWTIME_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy lịch chiếu');
    if (error.message === 'MOVIE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phim');
    
    // BẮT LỖI TẠI ĐÂY
    if (error.message === 'INVALID_START_TIME') {
      return sendResponse(res, 400, 'Ngày tạo lịch chiếu không được diễn ra trước ngày khởi chiếu của bộ phim!');
    }

    return sendResponse(res, 500, 'Lỗi cập nhật', { error: error.message });
  }
}
exports.deleteShowtime = async (req, res) => {
  try {
    await showtimeService.deleteShowtime(req.params.id);
    return sendResponse(res, 200, 'Xóa lịch chiếu thành công');
  } catch (error) {
    if (error.message === 'SHOWTIME_NOT_FOUND')
      return sendResponse(res, 404, 'Không tìm thấy lịch chiếu');
 
    if (error.message === 'SHOWTIME_HAS_ACTIVE_BOOKINGS') {
      const allowAt = new Date(error.allowDeleteAt).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      return sendResponse(res, 400,
        `Không thể xóa! Suất chiếu đang có ${error.count} đơn đặt vé. Có thể xóa sau ${allowAt}`
      );
    }
 
    return sendResponse(res, 500, 'Lỗi khi xóa', { error: error.message });
  }
};

exports.getShowtimesByRoom = async (req, res) => {
  try {
    const showtimes = await showtimeService.getShowtimesByRoom(req.params.roomId, req.query.date);
    return sendResponse(res, 200, `Tìm thấy ${showtimes.length} suất chiếu`, { showtimes });
  } catch (error) {
    if (error.message === 'ROOM_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phòng chiếu');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.checkConflict = async (req, res) => {
  try {
    const { movie_id, room_id, start_time, exclude_id } = req.body;
    const result = await showtimeService.checkConflict(movie_id, room_id, start_time, exclude_id);
    
    return sendResponse(res, 200, result.hasConflict ? 'Có xung đột lịch chiếu' : 'Không có xung đột', result);
  } catch (error) {
    if (error.message === 'MISSING_CONFLICT_INFO') return sendResponse(res, 400, 'Thiếu thông tin: movie_id, room_id, start_time');
    if (error.message === 'MOVIE_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy phim');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};