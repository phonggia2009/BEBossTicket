const { Booking, Ticket } = require('../models');
const sendResponse = require('../utils/responseHelper');
const bookingService = require('../services/booking.service');
const crypto = require('crypto');
const moment = require('moment');
const qs = require('qs');

// ─────────────────────────────────────────────
// Sort object theo key (KHÔNG encode)
// ─────────────────────────────────────────────
function sortObject(obj) {
  return Object.keys(obj)
    .sort()
    .reduce((result, key) => {
      result[key] = obj[key];
      return result;
    }, {});
}

// ─────────────────────────────────────────────
// Tạo chữ ký HMAC SHA512 (CHUẨN VNPAY)
// ─────────────────────────────────────────────
function createVnpSignature(params, secretKey) {
  const sortedParams = sortObject(params);
 
  const signData = Object.keys(sortedParams)
    .map(key => {
      return key + '=' + encodeURIComponent(sortedParams[key]).replace(/%20/g, '+');
    })
    .join('&');
    //  console.log("======= VNPAY DEBUG =======");
    //   console.log("PARAMS:", sortedParams);
    //   console.log("SIGN DATA:", signData);
    //   console.log("SECRET KEY:", secretKey);
  return crypto
    .createHmac('sha512', secretKey)
    .update(signData, 'utf-8')
    .digest('hex');
  
}

// ─────────────────────────────────────────────
// Lấy IP client
// ─────────────────────────────────────────────
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    '127.0.0.1'
  );
}

// ─────────────────────────────────────────────
// TẠO URL THANH TOÁN
// ─────────────────────────────────────────────
exports.createVnpayUrl = async (req, res) => {
  try {
    const { booking_id } = req.body;

    if (!booking_id) {
      return sendResponse(res, 400, 'Thiếu booking_id');
    }

    const booking = await Booking.findByPk(booking_id);
    if (!booking) {
      return sendResponse(res, 404, 'Không tìm thấy đơn');
    }

    if (booking.status !== 'PENDING') {
      return sendResponse(res, 400, 'Đơn không hợp lệ');
    }

    const totalAmount = Number(booking.total_price);
    if (!totalAmount || totalAmount <= 0) {
      return sendResponse(res, 400, 'Số tiền không hợp lệ');
    }

    const tmnCode   = process.env.VNP_TMNCODE;
    const secretKey = process.env.VNP_HASHSECRET;
    const vnpUrl    = process.env.VNP_URL;
    const returnUrl = process.env.VNP_RETURN_URL;

    const createDate = moment().format('YYYYMMDDHHmmss');
    const txnRef = `${booking.booking_id}_${Date.now()}`;

    let vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: `Thanh toan ve xem phim ${txnRef}`,
      vnp_OrderType: 'other',
      vnp_Amount: totalAmount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: getClientIp(req),
      vnp_CreateDate: createDate,
    };

    // 🔑 Tạo chữ ký
    const secureHash = createVnpSignature(vnp_Params, secretKey);

    // Gắn chữ ký
    vnp_Params.vnp_SecureHash = secureHash;

    // Build URL (encode full)
    const paymentUrl = vnpUrl + '?' + qs.stringify(vnp_Params, { encode: true });

    return sendResponse(res, 200, 'OK', { paymentUrl });

  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, 'Server error');
  }
};

// ─────────────────────────────────────────────
// RETURN URL (redirect browser)
// ─────────────────────────────────────────────
exports.vnpayReturn = async (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    let vnp_Params = { ...req.query };

    const secureHash = vnp_Params.vnp_SecureHash;

    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    const secretKey = process.env.VNP_HASHSECRET;
    const checkSum = createVnpSignature(vnp_Params, secretKey);

    if (secureHash !== checkSum) {
      return res.redirect(`${frontendUrl}/payment/result?status=invalid`);
    }

    const responseCode = vnp_Params.vnp_ResponseCode;
    const txnRef = vnp_Params.vnp_TxnRef;
    const bookingId = txnRef.split('_')[0]; 
    
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.redirect(`${frontendUrl}/payment/result?status=not_found`);
    }

    // Nếu đơn đã xử lý xong (PAID, CANCELLED, EXPIRED...) thì không xử lý lại
    if (booking.status !== 'PENDING') {
      return res.redirect(`${frontendUrl}/payment/result?status=already`);
    }

    if (responseCode === '00') {
      // Thanh toán thành công -> Cập nhật trạng thái PAID
      await bookingService.markBookingAsPaid(bookingId, 'SUCCESS');
      return res.redirect(`${frontendUrl}/payment/result?status=success&bookingId=${bookingId}`);
    } else {
      await bookingService.cancelBooking(booking.booking_id, 'CANCELLED');
      // Thêm &bookingId=${bookingId} vào đây
      return res.redirect(`${frontendUrl}/payment/result?status=failed&bookingId=${bookingId}`);
    }

  } catch (error) {
    console.error(error);
    return res.redirect(`${frontendUrl}/payment/result?status=error`);
  }
};

// ─────────────────────────────────────────────
// IPN (quan trọng nhất)
// ─────────────────────────────────────────────
exports.vnpayIpn = async (req, res) => {
  try {
    let vnp_Params = { ...req.query };

    const secureHash = vnp_Params.vnp_SecureHash;

    delete vnp_Params.vnp_SecureHash;
    delete vnp_Params.vnp_SecureHashType;

    const secretKey = process.env.VNP_HASHSECRET;
    const checkSum = createVnpSignature(vnp_Params, secretKey);

    // 1. Kiểm tra chữ ký bảo mật
    if (secureHash !== checkSum) {
      return res.status(200).json({ RspCode: '97', Message: 'Invalid Checksum' });
    }

    const txnRef = vnp_Params.vnp_TxnRef;
    const bookingId = txnRef.split('_')[0]; 
    const responseCode = vnp_Params.vnp_ResponseCode;
    const amount = parseInt(vnp_Params.vnp_Amount);

    // 2. Tìm đơn hàng
    const booking = await Booking.findByPk(bookingId);
    if (!booking) {
      return res.status(200).json({ RspCode: '01', Message: 'Not found' });
    }

    // 3. Kiểm tra số tiền
    if (Number(booking.total_price) * 100 !== amount) {
      return res.status(200).json({ RspCode: '04', Message: 'Invalid amount' });
    }

    // 4. Kiểm tra trạng thái đơn hàng (chỉ xử lý khi đang PENDING)
    if (booking.status !== 'PENDING') {
      return res.status(200).json({ RspCode: '02', Message: 'Already updated' });
    }

    // 5. Xử lý kết quả thanh toán
    if (responseCode === '00') {
      // Thanh toán thành công
      await bookingService.markBookingAsPaid(bookingId, 'SUCCESS');
    } else {
      // Thanh toán thất bại hoặc bị hủy -> Gọi hàm xử lý hủy toàn diện
      // Hàm này xử lý đổi trạng thái Booking, hủy Ticket và cộng lại số lượng bắp nước.
      await bookingService.cancelBooking(booking.booking_id, 'CANCELLED');
    }

    // 6. Trả về kết quả thành công cho VNPay để họ không gửi lại IPN nữa
    return res.status(200).json({ RspCode: '00', Message: 'Success' });

  } catch (error) {
    console.error("Lỗi tại VNPay IPN:", error);
    return res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
  }
};