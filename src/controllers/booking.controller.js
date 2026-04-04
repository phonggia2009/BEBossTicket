const bookingService = require('../services/booking.service');
const sendResponse = require('../utils/responseHelper');
const crypto = require('crypto');
const moment = require('moment');
const qs     = require('qs');
const socketUtil = require('../utils/socket');


function sortObject(obj) {
  return Object.keys(obj).sort().reduce((sorted, key) => {
    sorted[key] = obj[key];
    return sorted;
  }, {});
}

function buildVnpayUrl(req, booking) {
  const tmnCode   = process.env.VNP_TMNCODE;
  const secretKey = process.env.VNP_HASHSECRET;
  let   vnpUrl    = process.env.VNP_URL;
  const returnUrl = process.env.VNP_RETURN_URL;

  const totalAmount = Number(booking.total_price);
  const createDate  = moment().format('YYYYMMDDHHmmss');
  const txnRef = `${booking.booking_id}_${Date.now()}`;
  const ipAddr      = req.headers['x-forwarded-for']?.split(',')[0].trim()
                      || req.socket?.remoteAddress
                      || '127.0.0.1';

  let vnp_Params = {
    vnp_Version   : '2.1.0',
    vnp_Command   : 'pay',
    vnp_TmnCode   : tmnCode,
    vnp_Locale    : 'vn',
    vnp_CurrCode  : 'VND',
    vnp_TxnRef    : txnRef,
    vnp_OrderInfo : 'Thanh toan ve xem phim ma ' + txnRef,
    vnp_OrderType : 'other',
    vnp_Amount    : totalAmount * 100,
    vnp_ReturnUrl : returnUrl,
    vnp_IpAddr    : ipAddr,
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnp_Params);
  const signData = Object.keys(sortedParams)
  .map(key => key + '=' + encodeURIComponent(sortedParams[key]).replace(/%20/g, '+'))
  .join('&');
  console.log("SIGN DATA:", signData);
  const signed       = crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');
  console.log("HASH:", signed);
  vnp_Params         = sortObject(vnp_Params);
  vnp_Params['vnp_SecureHash'] = signed;

  return vnpUrl + '?' + qs.stringify(vnp_Params, { encode: false });
}

// ─────────────────────────────────────────────
// Tạo đơn đặt vé + trả về URL thanh toán VNPay
// POST /api/bookings
// ─────────────────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const userId  = req.user.id;
    const booking = await bookingService.createBooking(userId, req.body);

    const totalAmount = Number(booking.total_price);
    if (!totalAmount || isNaN(totalAmount) || totalAmount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const paymentUrl = buildVnpayUrl(req, booking);
    console.log("🔥 BUILD VNPAY URL CALLED");
    console.log("PAYMENT URL:", paymentUrl);
    try {
      const io = socketUtil.getIo();
      const showtimeId = req.body.showtime_id;
      const seatIds = req.body.seat_ids;

      // Xoá ghế khỏi danh sách holding tạm thời
      const holdingSeats = socketUtil.getHoldingSeats();
      if (holdingSeats[showtimeId]) {
        seatIds.forEach(seatId => {
          delete holdingSeats[showtimeId][seatId];
        });
      }

      // Thông báo cho tất cả client đang xem suất chiếu này
      io.to(`showtime_${showtimeId}`).emit('seatsBooked', {
        showtimeId,
        seatIds
      });
    } catch (socketError) {
      console.error("Lỗi emit socket khi tạo booking:", socketError);
      // Dù lỗi socket thì vẫn để flow tạo booking tiếp tục bình thường
    }
    // ==========================================

    return sendResponse(res, 201, 'Tạo đơn đặt vé thành công', {
      booking,
      paymentUrl,
    });

  } catch (error) {
    if (error.message === 'INVALID_DATA')
      return sendResponse(res, 400, 'Dữ liệu đặt vé không hợp lệ');
    if (error.message === 'SHOWTIME_NOT_FOUND')
      return sendResponse(res, 404, 'Không tìm thấy lịch chiếu');
    if (error.message === 'SHOWTIME_STARTED')
      return sendResponse(res, 400, 'Suất chiếu này đã bắt đầu, không thể đặt vé');
    if (error.message === 'SEAT_ALREADY_BOOKED')
      return sendResponse(res, 409, 'Rất tiếc, ghế bạn chọn vừa có người đặt. Vui lòng chọn ghế khác!');
    if (error.message === 'INVALID_SEATS')
      return sendResponse(res, 400, 'Ghế không hợp lệ hoặc không thuộc phòng chiếu này');
    if (error.message === 'INVALID_AMOUNT')
      return sendResponse(res, 400, 'Số tiền thanh toán không hợp lệ');
    if (error.message.startsWith('PRODUCT_NOT_FOUND'))
      return sendResponse(res, 404, `Không tìm thấy sản phẩm mã: ${error.message.split('|')[1]}`);
    if (error.message.startsWith('OUT_OF_STOCK'))
      return sendResponse(res, 400, `Sản phẩm ${error.message.split('|')[1]} hiện đã hết hàng`);

    return sendResponse(res, 500, 'Lỗi hệ thống khi đặt vé', { error: error.message });
  }
};


exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await bookingService.getMyBookings(req.user.id);
    return sendResponse(res, 200, 'Lấy danh sách vé thành công', { bookings });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống!', { error: error.message });
  }
};
// ─────────────────────────────────────────────
// Xem chi tiết một đơn đặt vé
// GET /api/bookings/:id
// ─────────────────────────────────────────────
exports.getBookingById = async (req, res) => {
  try {
    const userId    = req.user.id;
    const bookingId = req.params.id;
    const booking   = await bookingService.getBookingById(userId, bookingId);

    return sendResponse(res, 200, 'Lấy chi tiết đơn đặt vé thành công', { booking });
  } catch (error) {
    if (error.message === 'BOOKING_NOT_FOUND')
      return sendResponse(res, 404, 'Không tìm thấy đơn đặt vé');

    return sendResponse(res, 500, 'Lỗi hệ thống khi lấy chi tiết đơn đặt vé', { error: error.message });
  }
};

exports.cancelMyBooking = async (req, res) => {
  try {
    const userId = req.user.id; // Lấy ID user từ token đăng nhập
    const bookingId = req.params.id;

    // 1. Tìm đơn hàng để kiểm tra quyền sở hữu
    // (Phải check để tránh user này truyền ID đi hủy đơn của user khác)
    const booking = await bookingService.getBookingById(userId, bookingId);
    
    if (!booking) {
      return sendResponse(res, 404, 'Không tìm thấy đơn đặt vé');
    }

    // 2. Kiểm tra trạng thái đơn hàng (chỉ cho phép hủy đơn PENDING)
    if (booking.status !== 'PENDING') {
      return sendResponse(res, 400, 'Chỉ có thể hủy đơn hàng chưa thanh toán');
    }

    // 3. Gọi hàm dùng chung để hủy đơn, hoàn vé, hoàn bắp nước
    const isCancelled = await bookingService.cancelBooking(bookingId, 'CANCELLED');

    if (isCancelled) {
      return sendResponse(res, 200, 'Hủy đơn đặt vé thành công');
    } else {
      return sendResponse(res, 400, 'Không thể hủy đơn đặt vé lúc này');
    }

  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống khi hủy đơn', { error: error.message });
  }
};

//ADMIN
// ─────────────────────────────────────────────
// [ADMIN] Xem danh sách tất cả Booking
// GET /api/admin/bookings
// ─────────────────────────────────────────────
exports.getAllBookingsAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    
    // Lấy query filters
    const filters = {
      status: req.query.status,
      booking_id: req.query.booking_id
    };

    const data = await bookingService.getAllBookings(page, limit, filters);
    return sendResponse(res, 200, 'Lấy danh sách đơn đặt vé thành công', data);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống khi lấy danh sách booking', { error: error.message });
  }
};

// ─────────────────────────────────────────────
// [ADMIN] Xem chi tiết 1 Booking
// GET /api/admin/bookings/:id
// ─────────────────────────────────────────────
exports.getBookingDetailAdmin = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = await bookingService.getAdminBookingDetail(bookingId);

    return sendResponse(res, 200, 'Lấy chi tiết đơn đặt vé thành công', { booking });
  } catch (error) {
    if (error.message === 'BOOKING_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy đơn đặt vé');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

// ─────────────────────────────────────────────
// [ADMIN] Force Cancel Booking
// POST hoặc PUT /api/admin/bookings/:id/cancel
// ─────────────────────────────────────────────
exports.forceCancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    await bookingService.forceCancelBooking(bookingId);

    return sendResponse(res, 200, 'Hủy đơn đặt vé thành công');
  } catch (error) {
    if (error.message === 'BOOKING_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy đơn đặt vé');
    }
    if (error.message === 'BOOKING_ALREADY_CANCELLED') {
      return sendResponse(res, 400, 'Đơn này đã bị hủy từ trước');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống khi hủy đơn', { error: error.message });
  }
};

// ─────────────────────────────────────────────
// [ADMIN] Cập nhật trạng thái Booking
// PATCH /api/admin/bookings/:id/status
// ─────────────────────────────────────────────
exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return sendResponse(res, 400, 'Vui lòng cung cấp trạng thái cần cập nhật (status)');
    }

    const booking = await bookingService.updateBookingStatus(bookingId, status);
    return sendResponse(res, 200, 'Cập nhật trạng thái thành công', { booking });
  } catch (error) {
    if (error.message === 'INVALID_STATUS') {
      return sendResponse(res, 400, 'Trạng thái không hợp lệ');
    }
    if (error.message === 'BOOKING_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy đơn đặt vé');
    }
    if (error.message === 'CANNOT_RESTORE_CANCELLED_BOOKING') {
      return sendResponse(res, 400, 'Đơn hàng đã hủy không thể khôi phục lại trạng thái khác. Vui lòng tạo đơn mới!');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống khi cập nhật', { error: error.message });
  }
};

// Thêm vào file controllers/booking.controller.js
exports.checkInTicket = async (req, res) => {
  try {
    const { booking_id } = req.body;
    if (!booking_id) return sendResponse(res, 400, 'Thiếu mã đơn hàng');

    const booking = await bookingService.checkInBooking(booking_id);
    return sendResponse(res, 200, 'Soát vé thành công!', { booking });
  } catch (error) {
    if (error.message === 'BOOKING_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy đơn hàng');
    if (error.message === 'BOOKING_ALREADY_USED') return sendResponse(res, 400, 'Vé này ĐÃ ĐƯỢC SỬ DỤNG trước đó!');
    if (error.message === 'BOOKING_CANCELLED') return sendResponse(res, 400, 'Vé này đã bị hủy!');
    if (error.message === 'INVALID_STATUS_FOR_CHECKIN') return sendResponse(res, 400, 'Vé chưa được thanh toán!');
    
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};