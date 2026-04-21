const models = require('../models');
const { Booking, Ticket, BookingItem, Showtime, Seat, Product, ShowtimePrice, Movie, Voucher } = models;
const sequelize = models.sequelize || Booking.sequelize;
const { Op } = require('sequelize');
const userService = require('./user.service'); // Import userService để log lịch sử điểm

const EXPIRE_MINUTES = 15;

// ─────────────────────────────────────────────
// CREATE BOOKING
// ─────────────────────────────────────────────
exports.createBooking = async (userId, bookingData) => {
  const { showtime_id, seat_ids, products = [], voucher_code } = bookingData;

  if (!showtime_id || !Array.isArray(seat_ids) || seat_ids.length === 0) {
    throw new Error('INVALID_DATA');
  }

  const t = await sequelize.transaction();

  try {
    // 1. Validate showtime
    const showtime = await Showtime.findByPk(showtime_id, { transaction: t });
    if (!showtime) throw new Error('SHOWTIME_NOT_FOUND');

    if (new Date(showtime.start_time) < new Date()) {
      throw new Error('SHOWTIME_STARTED');
    }

    // 2. Lock seats
    const existingTickets = await Ticket.findAll({
      where: {
        showtime_id,
        seat_id: { [Op.in]: seat_ids },
        status: 'BOOKED'
      },
      lock: t.LOCK.UPDATE,
      transaction: t
    });

    if (existingTickets.length > 0) {
      throw new Error('SEAT_ALREADY_BOOKED');
    }

    // 3. Get seats + pricing
    const seats = await Seat.findAll({
      where: { id: { [Op.in]: seat_ids }, room_id: showtime.room_id },
      transaction: t
    });

    if (seats.length !== seat_ids.length) {
      throw new Error('INVALID_SEATS');
    }

    const showtimePrices = await ShowtimePrice.findAll({
      where: { showtime_id },
      transaction: t
    });

    let totalTicketPrice = 0;

    const tickets = seats.map(seat => {
      const priceRecord = showtimePrices.find(sp => sp.seat_type === seat.seat_type);
      const price = priceRecord ? parseInt(priceRecord.price, 10) : 0;
      totalTicketPrice += price;

      return {
        showtime_id,
        seat_id: seat.id,
        price,
        status: 'BOOKED'
      };
    });

    // 4. Handle products
    let totalProductPrice = 0;
    const bookingItems = [];

    if (products.length > 0) {
      const productIds = products.map(p => p.product_id);

      const dbProducts = await Product.findAll({
        where: { id: { [Op.in]: productIds }, isAvailable: true },
        transaction: t
      });

      for (const item of products) {
        const dbProduct = dbProducts.find(p => p.id === item.product_id);
        if (!dbProduct) throw new Error(`PRODUCT_NOT_FOUND|${item.product_id}`);

        if (dbProduct.quantity < item.quantity) {
          throw new Error(`OUT_OF_STOCK|${dbProduct.product_name}`);
        }

        const price = parseInt(dbProduct.price, 10);
        totalProductPrice += price * item.quantity;

        bookingItems.push({
          product_id: dbProduct.id,
          quantity: item.quantity,
          price
        });

        await dbProduct.decrement('quantity', { by: item.quantity, transaction: t });
      }
    }

    let originalTotalPrice = totalTicketPrice + totalProductPrice;
    let discountAmount = 0;
    let appliedVoucherId = null;

    if (voucher_code) {
      const voucher = await Voucher.findOne({
        where: { code: voucher_code, is_active: true },
        transaction: t
      });

      if (!voucher) throw new Error('VOUCHER_NOT_FOUND');

      const now = new Date();
      if (now < voucher.start_date || now > voucher.end_date) throw new Error('VOUCHER_EXPIRED');
      if (voucher.used_count >= voucher.usage_limit) throw new Error('VOUCHER_OUT_OF_USAGE');
      if (originalTotalPrice < voucher.min_order_value) throw new Error('ORDER_VALUE_NOT_ENOUGH');

      if (voucher.discount_type === 'FIXED') {
        discountAmount = voucher.discount_value;
      } else {
        discountAmount = (originalTotalPrice * voucher.discount_value) / 100;
        if (voucher.max_discount && discountAmount > voucher.max_discount) {
          discountAmount = voucher.max_discount;
        }
      }

      if (discountAmount > originalTotalPrice) discountAmount = originalTotalPrice;
      appliedVoucherId = voucher.id;

      // Trừ đi 1 lượt sử dụng của Voucher
      await voucher.increment('used_count', { by: 1, transaction: t });
    }
    
    const user = await models.User.findByPk(userId, { transaction: t });
    if (!user) throw new Error('USER_NOT_FOUND');

    let pointsDiscount = 0;
    let pointsUsedValue = 0;

    // Nếu request có gửi lên số điểm muốn sử dụng
    if (bookingData.points_used && bookingData.points_used > 0) {
      if (user.points < bookingData.points_used) {
        throw new Error('NOT_ENOUGH_POINTS');
      }
      
      // 100 điểm = 1000 VNĐ => 1 điểm = 10 VNĐ (tạm thời logic cũ là 1 điểm = 1 VNĐ)
      pointsDiscount = bookingData.points_used * 1;
      pointsUsedValue = bookingData.points_used;

      // Đảm bảo không giảm quá số tiền thực tế cần thanh toán (sau khi áp voucher)
      const priceAfterVoucher = originalTotalPrice - discountAmount;
      if (pointsDiscount > priceAfterVoucher) {
        pointsDiscount = priceAfterVoucher;
        pointsUsedValue = pointsDiscount;
      }

      // Trừ điểm của user ngay khi tạo đơn
      await user.decrement('points', { by: pointsUsedValue, transaction: t });
      
      // 👉 GHI LOG: Dùng điểm khi đặt vé
      await userService.logPointChange(
        userId, 
        -pointsUsedValue, 
        user.points - pointsUsedValue, 
        `Sử dụng điểm cho đơn hàng đang chờ thanh toán`, 
        t
      );
    }
    // --------------------------------

    // Tính tổng tiền thanh toán cuối cùng (Đã trừ voucher và điểm)
    const finalTotalPrice = originalTotalPrice - discountAmount - pointsDiscount;

    // Tính điểm nhận được: 1.000 VNĐ thực trả = 1 điểm
    let pointsEarnedValue = 0;
    if (pointsUsedValue === 0) {
      pointsEarnedValue = Math.floor(finalTotalPrice / 1000);
    }

    // 5. Create booking with expiration
    const newBooking = await Booking.create({
      user_id: userId,
      showtime_id,
      total_price: finalTotalPrice,
      discount_amount: discountAmount + pointsDiscount, // Tổng giảm (voucher + điểm)
      voucher_id: appliedVoucherId,
      points_used: pointsUsedValue,     // Ghi nhận điểm đã dùng
      points_earned: pointsEarnedValue, // Ghi nhận điểm sẽ được cộng
      status: 'PENDING',
      expired_at: new Date(Date.now() + EXPIRE_MINUTES * 60 * 1000)
    }, { transaction: t });

    // 6. Insert tickets
    const ticketsWithBookingId = tickets.map(tk => ({
      ...tk,
      booking_id: newBooking.booking_id
    }));

    await Ticket.bulkCreate(ticketsWithBookingId, { transaction: t });

    // 7. Insert products
    if (bookingItems.length > 0) {
      const itemsWithBookingId = bookingItems.map(item => ({
        ...item,
        booking_id: newBooking.booking_id
      }));

      await BookingItem.bulkCreate(itemsWithBookingId, { transaction: t });
    }

    await t.commit();
    return newBooking;

  } catch (error) {
    await t.rollback();
    throw error;
  }
};

// ─────────────────────────────────────────────
// VALIDATE BEFORE PAYMENT
// ─────────────────────────────────────────────
exports.validateBookingBeforePayment = async (bookingId) => {
  const booking = await Booking.findByPk(bookingId);

  if (!booking) throw new Error('BOOKING_NOT_FOUND');

  if (booking.status !== 'PENDING') {
    throw new Error('BOOKING_NOT_VALID');
  }

  if (booking.expired_at < new Date()) {
    throw new Error('BOOKING_EXPIRED');
  }

  return booking;
};

exports.getMyBookings = async (userId) => {
  const BUFFER_MINUTES = 30;

  const pendingBookings = await Booking.findAll({
    where: { user_id: userId, status: 'PENDING' },
    include: [{
      model: Showtime,
      as: 'showtime',
      paranoid: false,
      include: [{ model: Movie, as: 'movie', attributes: ['duration'] }]
    }]
  });

  // 2. Lọc ra các booking đã quá hạn theo thời lượng suất chiếu
  const expiredBookings = pendingBookings.filter(b => {
    if (!b.showtime?.start_time) return false;
    const movieDuration = b.showtime.movie?.duration || 0;
    const expireAt = new Date(
      new Date(b.showtime.start_time).getTime() +
      (movieDuration + BUFFER_MINUTES) * 60 * 1000
    );
    return new Date() > expireAt;
  });

  // 3. Dùng hàm cancelBooking để xử lý hủy toàn diện (hoàn vé, hoàn sản phẩm)
  for (const b of expiredBookings) {
    await exports.cancelBooking(b.booking_id, 'CANCELLED');
  }

  // 4. Query lại danh sách vé mới nhất (sau khi đã dọn dẹp data) để trả về cho Frontend
  const bookings = await Booking.findAll({
    where: { user_id: userId },
    order: [['booking_time', 'DESC']],
    include: [
      {
        model: Showtime,
        as: 'showtime',
        paranoid: false, // lấy cả showtime đã xóa mềm
        include: [
          { model: models.Movie, as: 'movie', attributes: ['title', 'posterUrl'] },
          {
            model: models.Room, as: 'room',
            include: [{ model: models.Cinema, as: 'cinema', attributes: ['cinema_name'] }]
          }
        ]
      },
      {
        model: Ticket, as: 'tickets',
        include: [{ model: Seat, as: 'seat', attributes: ['seat_row', 'seat_number', 'seat_type'] }]
      },
      {
        model: BookingItem, as: 'products',
        include: [{ model: Product, as: 'product', attributes: ['product_name', 'imageUrl'] }]
      }
    ]
  });

  return bookings;
};

// ─────────────────────────────────────────────
// MARK BOOKING AS PAID
// ─────────────────────────────────────────────
exports.markBookingAsPaid = async (bookingId) => {
  const t = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(bookingId, { transaction: t });
    
    if (!booking) {
      await t.rollback();
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.status !== 'PENDING') {
      await t.rollback();
      return booking;
    }

    const user = await models.User.findByPk(booking.user_id, { transaction: t });
    if (!user) {
      await t.rollback();
      throw new Error('USER_NOT_FOUND');
    }

    // 👉 Cộng điểm
    if (booking.points_earned > 0) {
      await user.increment('points', { by: booking.points_earned, transaction: t });
      
      // 👉 Ghi log điểm
      await userService.logPointChange(
        user.id, 
        booking.points_earned, 
        user.points + booking.points_earned, 
        `Tích điểm từ đơn hàng thành công #${booking.booking_id}`,
        t
      );
    }

    // 👉 Cập nhật booking
    await booking.update({ status: 'SUCCESS' }, { transaction: t });

    await t.commit();
    return booking;
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    throw error;
  }
};

// ─────────────────────────────────────────────
// LẤY CHI TIẾT 1 ĐƠN HÀNG KÈM CHECK QUYỀN SỞ HỮU
// ─────────────────────────────────────────────
exports.getBookingById = async (userId, bookingId) => {
  const booking = await Booking.findOne({
    where: { 
      booking_id: bookingId,
      user_id: userId // Bắt buộc phải khớp userId để bảo mật
    }
  });

  if (!booking) {
    throw new Error('BOOKING_NOT_FOUND');
  }

  return booking;
};

// ─────────────────────────────────────────────
// HỦY ĐƠN HÀNG (DÙNG CHUNG CHO VNPAY & CRONJOB)
// ─────────────────────────────────────────────
exports.cancelBooking = async (bookingId, cancelStatus = 'CANCELLED') => {
  const t = await sequelize.transaction();

  try {
    // 1. Tìm đơn hàng và KHÓA dòng này lại
    const booking = await Booking.findByPk(bookingId, {
      transaction: t,
      lock: t.LOCK.UPDATE 
    });

    if (!booking) {
      await t.rollback();
      return false;
    }

    // 2. Chỉ xử lý hủy nếu đơn đang ở trạng thái PENDING
    if (booking.status !== 'PENDING') {
      await t.rollback();
      return false; 
    }

    // 3. Lấy danh sách sản phẩm (Bắp/Nước) của đơn hàng này
    const bookingItems = await BookingItem.findAll({
      where: { booking_id: bookingId },
      include: [{ model: Product, as: 'product' }],
      transaction: t
    });

    // 4. Hoàn lại số lượng bắp/nước vào kho
    for (const item of bookingItems) {
      if (item.product) {
        await item.product.increment('quantity', {
          by: item.quantity,
          transaction: t
        });
      }
    }

    if (booking.voucher_id) {
      const voucher = await Voucher.findByPk(booking.voucher_id, { transaction: t });
      if (voucher && voucher.used_count > 0) {
        await voucher.decrement('used_count', { by: 1, transaction: t });
      }
    }

    // 5. Cập nhật trạng thái Booking (thành CANCELLED hoặc EXPIRED)
    await booking.update({ status: cancelStatus }, { transaction: t });

    if (booking.points_used > 0) {
      const user = await models.User.findByPk(booking.user_id, { transaction: t });
      if (user) {
        await user.increment('points', { by: booking.points_used, transaction: t });
        
        // 👉 GHI LOG: Hoàn điểm khi hủy đơn
        await userService.logPointChange(
          user.id, 
          booking.points_used, 
          user.points + booking.points_used, 
          `Hoàn điểm từ đơn hàng bị hủy/hết hạn #${booking.booking_id}`,
          t
        );
      }
    }

    // 6. Giải phóng ghế (cập nhật Ticket thành CANCELLED)
    await Ticket.update(
      { status: 'CANCELLED' },
      { where: { booking_id: bookingId }, transaction: t }
    );

    await t.commit();
    return true;

  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error(`[Lỗi] Hủy booking ${bookingId} thất bại:`, error);
    throw error;
  }
};

exports.expireBookingsByShowtime = async () => {
  const BUFFER_MINUTES = 30;
  const EXPIRE_MINUTES = 15;

  const pendingBookings = await Booking.findAll({
    where: { status: 'PENDING' },
    include: [{
      model: Showtime,
      as: 'showtime',
      paranoid: false,
      include: [{ model: Movie, as: 'movie', attributes: ['duration'] }]
    }]
  });

  let updatedCount = 0;
  const now = new Date();

  for (const b of pendingBookings) {
    let shouldExpire = false;

    // ── Điều kiện 1: Quá 15p kể từ lúc tạo booking chưa thanh toán ──
    const createdAt = new Date(b.booking_time).getTime();
    const expireAt15p = new Date(createdAt + EXPIRE_MINUTES * 60 * 1000);
    if (now > expireAt15p) {
      shouldExpire = true;
      console.log(`[CRON] Booking ${b.booking_id} hết hạn 15p chưa thanh toán`);
    }

    // ── Điều kiện 2: Suất chiếu đã kết thúc + 30p buffer ──
    if (!shouldExpire && b.showtime?.start_time) {
      const movieDuration = b.showtime.movie?.duration || 0;
      const expireAtShowtime = new Date(
        new Date(b.showtime.start_time).getTime() +
        (movieDuration + BUFFER_MINUTES) * 60 * 1000
      );
      if (now > expireAtShowtime) {
        shouldExpire = true;
        console.log(`[CRON] Booking ${b.booking_id} hết hạn theo suất chiếu`);
      }
    }

    if (shouldExpire) {
      await exports.cancelBooking(b.booking_id, 'CANCELLED');
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`[CRON] Đã hủy ${updatedCount} booking hết hạn`);
  }
  return { updated: updatedCount };
};

// ─────────────────────────────────────────────
// [ADMIN] LẤY DANH SÁCH TẤT CẢ BOOKING
// ─────────────────────────────────────────────
exports.getAllBookings = async (page = 1, limit = 15, filters = {}) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (filters.status) whereClause.status = filters.status;
  if (filters.booking_id) whereClause.booking_id = filters.booking_id;

  const { count, rows } = await Booking.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['booking_time', 'DESC']], // Đơn mới nhất lên đầu
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'phoneNumber']
      },
      {
        model: Showtime,
        as: 'showtime',
        paranoid: false,
        include: [
          { model: models.Movie, as: 'movie', attributes: ['title'] },
          { model: models.Room, as: 'room', attributes: ['room_name'] }
        ]
      }
    ]
  });

  return {
    bookings: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }
  };
};

exports.sendShowtimeReminders = async () => {
  try {
    const now = new Date();
    // Lấy thời điểm 30 phút sau tính từ hiện tại
    const thirtyMinutesLater = new Date(now.getTime() + 30 * 60000); 

    // 1. Tìm các booking thỏa mãn điều kiện
    const upcomingBookings = await Booking.findAll({
      where: {
        status: 'SUCCESS', // Chỉ gửi cho vé đã thanh toán thành công (Tùy logic status của bạn)
        isReminderSent: false // Chưa gửi mail
      },
      include: [
        {
          model: Showtime,
          as: 'showtime', // Tên alias bạn định nghĩa trong associations
          where: {
             // Thời gian chiếu nằm trong khoảng (Bây giờ -> 30 phút nữa)
             startTime: {
               [Op.between]: [now, thirtyMinutesLater]
             }
          },
          include: [{ model: Movie, as: 'movie' }] // Kéo theo tên phim để gửi mail
        },
        {
          model: User,
          as: 'user',
          attributes: ['email', 'username', 'fullName'] // Cần email để gửi
        }
      ]
    });

    if (upcomingBookings.length === 0) return 0;

    // 2. Gửi mail cho từng booking
    let sentCount = 0;
    for (const booking of upcomingBookings) {
      if (booking.user && booking.user.email) {
        const emailSubject = `⏰ Nhắc nhở: Phim ${booking.showtime.movie.title} sắp bắt đầu!`;
        const emailHtml = `
          <h2>Xin chào ${booking.user.fullName || booking.user.username},</h2>
          <p>Suất chiếu phim <strong>${booking.showtime.movie.title}</strong> của bạn sẽ bắt đầu vào lúc <strong>${moment(booking.showtime.startTime).format('HH:mm DD/MM/YYYY')}</strong>.</p>
          <p>Vui lòng đến rạp sớm 10-15 phút để lấy vé và mua bắp nước nhé!</p>
          <p>Cảm ơn bạn đã sử dụng BossTicket!</p>
        `;

        try {
          // Gọi hàm sendEmail từ utils/mailer.js
          await mailer.sendEmail(booking.user.email, emailSubject, emailHtml);
          
          // Gửi xong thì update trạng thái
          booking.isReminderSent = true;
          await booking.save();
          sentCount++;
          
        } catch (mailErr) {
          console.error(`Lỗi gửi mail cho booking ${booking.id}:`, mailErr.message);
          // Không văng lỗi (throw) ở đây để vòng lặp vẫn tiếp tục gửi cho người khác
        }
      }
    }

    return sentCount;
  } catch (error) {
    console.error('Lỗi ở sendShowtimeReminders service:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// [ADMIN] LẤY CHI TIẾT BOOKING (KHÔNG CHECK USER_ID)
// ─────────────────────────────────────────────
exports.getAdminBookingDetail = async (bookingId) => {
  const booking = await Booking.findByPk(bookingId, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'phoneNumber']
      },
      {
        model: Showtime,
        as: 'showtime',
        paranoid: false,
        include: [
          { model: models.Movie, as: 'movie', attributes: ['title', 'posterUrl'] },
          { 
            model: models.Room, 
            as: 'room', 
            include: [{ model: models.Cinema, as: 'cinema', attributes: ['cinema_name'] }] 
          }
        ]
      },
      {
        model: Ticket, as: 'tickets',
        include: [{ model: Seat, as: 'seat', attributes: ['seat_row', 'seat_number', 'seat_type'] }]
      },
      {
        model: BookingItem, as: 'products',
        include: [{ model: Product, as: 'product', attributes: ['product_name', 'imageUrl'] }]
      }
    ]
  });

  if (!booking) throw new Error('BOOKING_NOT_FOUND');
  return booking;
};

// ─────────────────────────────────────────────
// [ADMIN] FORCE CANCEL BOOKING (Hủy mọi trường hợp)
// ─────────────────────────────────────────────
exports.forceCancelBooking = async (bookingId) => {
  const t = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(bookingId, {
      transaction: t,
      lock: t.LOCK.UPDATE 
    });

    if (!booking) {
      await t.rollback();
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.status === 'CANCELLED') {
      await t.rollback();
      throw new Error('BOOKING_ALREADY_CANCELLED');
    }

    // 1. Hoàn lại số lượng bắp nước vào kho
    const bookingItems = await BookingItem.findAll({
      where: { booking_id: bookingId },
      include: [{ model: Product, as: 'product' }],
      transaction: t
    });

    for (const item of bookingItems) {
      if (item.product) {
        await item.product.increment('quantity', { by: item.quantity, transaction: t });
      }
    }

    if (booking.voucher_id) {
      const voucher = await Voucher.findByPk(booking.voucher_id, { transaction: t });
      if (voucher && voucher.used_count > 0) {
        await voucher.decrement('used_count', { by: 1, transaction: t });
      }
    }

    // Lưu lại trạng thái cũ trước khi update
    const oldStatus = booking.status;

    // 2. Cập nhật trạng thái Booking
    await booking.update({ status: 'CANCELLED' }, { transaction: t });
    
    const user = await models.User.findByPk(booking.user_id, { transaction: t });
    if (user) {
      // TRƯỜNG HỢP 1: Nếu lúc đặt có dùng điểm -> Hoàn lại điểm
      if (booking.points_used > 0) {
        await user.increment('points', { by: booking.points_used, transaction: t });
        
        // 👉 GHI LOG
        await userService.logPointChange(
          user.id,
          booking.points_used,
          user.points + booking.points_used,
          `Admin hủy đơn: Hoàn lại điểm đã sử dụng từ đơn hàng #${booking.booking_id}`,
          t
        );
      }

      // TRƯỜNG HỢP 2: Nếu đơn ĐÃ THANH TOÁN THÀNH CÔNG và ĐÃ CỘNG ĐIỂM -> Thu hồi điểm đã cộng
      if (oldStatus === 'SUCCESS' && booking.points_earned > 0) {
        await user.decrement('points', { by: booking.points_earned, transaction: t });
        
        // 👉 GHI LOG
        await userService.logPointChange(
          user.id,
          -booking.points_earned,
          user.points - booking.points_earned,
          `Admin hủy đơn: Thu hồi điểm thưởng đã cộng từ đơn hàng #${booking.booking_id}`,
          t
        );
      }
    }

    // 3. Giải phóng ghế (Ticket -> CANCELLED)
    await Ticket.update(
      { status: 'CANCELLED' },
      { where: { booking_id: bookingId }, transaction: t }
    );

    await t.commit();
    return booking;
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    throw error;
  }
};
// [ADMIN] CẬP NHẬT TRẠNG THÁI BOOKING (Trường hợp đặc biệt)
exports.updateBookingStatus = async (bookingId, status) => {
  const validStatuses = ['PENDING', 'SUCCESS', 'CANCELLED']; 
  if (!validStatuses.includes(status)) {
    throw new Error('INVALID_STATUS');
  }

  // Bổ sung Transaction để đảm bảo tính toàn vẹn dữ liệu
  const t = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(bookingId, { 
      transaction: t,
      lock: t.LOCK.UPDATE 
    });

    if (!booking) {
      await t.rollback();
      throw new Error('BOOKING_NOT_FOUND');
    }

    if (booking.status === 'CANCELLED' && status !== 'CANCELLED') {
      await t.rollback();
      throw new Error('CANNOT_RESTORE_CANCELLED_BOOKING');
    }

    if (status === 'CANCELLED' && booking.status !== 'CANCELLED') {
      await t.rollback(); // Rollback transaction hiện tại vì forceCancelBooking đã tự quản lý transaction riêng
      return await exports.forceCancelBooking(bookingId);
    }
    
    // Xử lý logic khi Admin ép trạng thái sang SUCCESS
    if (status === 'SUCCESS' && booking.status !== 'SUCCESS') {
      if (booking.points_earned > 0) {
        const user = await models.User.findByPk(booking.user_id, { transaction: t });
        
        if (user) {
          // Cộng điểm cho user
          await user.increment('points', { by: booking.points_earned, transaction: t });
          
          // 👉 FIX LỖ HỔNG: Ghi log biến động điểm ngay trong transaction
          await userService.logPointChange(
            user.id,
            booking.points_earned,
            user.points + booking.points_earned, // Tổng điểm mới
            `Admin cập nhật thủ công: Tích điểm từ đơn hàng #${booking.booking_id}`,
            t
          );
        }
      }
    }

    // Cập nhật trạng thái
    await booking.update({ status }, { transaction: t });
    
    // Commit transaction nếu mọi thứ thành công
    await t.commit();
    return booking;

  } catch (error) {
    // Nếu có lỗi xảy ra thì rollback lại toàn bộ
    if (t && !t.finished) {
      await t.rollback();
    }
    throw error;
  }
};

exports.checkInBooking = async (bookingId) => {
  const booking = await Booking.findByPk(bookingId, {
    include: [
      {
        model: models.User,
        as: 'user',
        attributes: ['id', 'fullName', 'email', 'phoneNumber']
      },
      {
        model: Showtime,
        as: 'showtime',
        paranoid: false,
        include: [
          { model: models.Movie, as: 'movie', attributes: ['title', 'posterUrl'] },
          { 
            model: models.Room, 
            as: 'room', 
            include: [{ model: models.Cinema, as: 'cinema', attributes: ['cinema_name'] }] 
          }
        ]
      },
      {
        model: Ticket, as: 'tickets',
        include: [{ model: Seat, as: 'seat', attributes: ['seat_row', 'seat_number', 'seat_type'] }]
      },
      {
        model: BookingItem, as: 'products',
        include: [{ model: Product, as: 'product', attributes: ['product_name'] }]
      }
    ]
  });
  
  if (!booking) {
    throw new Error('BOOKING_NOT_FOUND');
  }

  // Chỉ cho phép check-in nếu vé đã thanh toán (SUCCESS)
  if (booking.status !== 'SUCCESS') {
    if (booking.status === 'USED') throw new Error('BOOKING_ALREADY_USED');
    if (booking.status === 'CANCELLED') throw new Error('BOOKING_CANCELLED');
    throw new Error('INVALID_STATUS_FOR_CHECKIN');
  }

  // Cập nhật trạng thái thành USED (Đã sử dụng)
  await booking.update({ status: 'USED' });
  return booking;
};