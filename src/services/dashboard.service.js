// sequelize INSTANCE đến từ db.sequelize (không destructure trực tiếp)
const db = require('../models');
const { Booking, Ticket, Showtime, Movie, Room, Comment, User } = db;
const sequelize = db.sequelize;          // instance để gọi query thô nếu cần

const { Op, fn, col, literal } = require('sequelize');

exports.getDashboardStats = async () => {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const sixMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 5, 1);

// ─────────────────────────────────────────────────────────────
  // 1. DOANH THU TÁCH RIÊNG: SUCCESS, NO_SHOW, USED
  // ─────────────────────────────────────────────────────────────
  const [revenueSuccess, revenueNoShow, revenueUsed] = await Promise.all([
    Booking.sum('total_price', { where: { status: 'SUCCESS' } }).then(v => v || 0),
    Booking.sum('total_price', { where: { status: 'NO_SHOW' } }).then(v => v || 0),
    Booking.sum('total_price', { where: { status: 'USED' } }).then(v => v || 0),
  ]);

  // CỘNG ĐỦ 3 TRẠNG THÁI
  const totalRevenue = revenueSuccess + revenueNoShow + revenueUsed;

  // ─────────────────────────────────────────────────────────────
  // 2. DOANH THU THÁNG NÀY & THÁNG TRƯỚC
  // ─────────────────────────────────────────────────────────────
  const [
    revenueSuccessThisMonth,
    revenueNoShowThisMonth,
    revenueUsedThisMonth, // Đã xếp lại thứ tự cho khớp với Promise.all bên dưới
    revenueSuccessLastMonth,
    revenueNoShowLastMonth,
    revenueUsedLastMonth,
  ] = await Promise.all([
    Booking.sum('total_price', {
      where: { status: 'SUCCESS', booking_time: { [Op.gte]: thisMonthStart } }
    }).then(v => v || 0),
    Booking.sum('total_price', {
      where: { status: 'NO_SHOW', booking_time: { [Op.gte]: thisMonthStart } }
    }).then(v => v || 0),
    Booking.sum('total_price', {
      where: { status: 'USED', booking_time: { [Op.gte]: thisMonthStart } } // Đã xóa Op.lt bị sai
    }).then(v => v || 0),

    // Tháng trước (gte: Đầu tháng trước, lt: Đầu tháng này)
    Booking.sum('total_price', {
      where: { status: 'SUCCESS', booking_time: { [Op.gte]: lastMonthStart, [Op.lt]: thisMonthStart } }
    }).then(v => v || 0),
    Booking.sum('total_price', {
      where: { status: 'NO_SHOW', booking_time: { [Op.gte]: lastMonthStart, [Op.lt]: thisMonthStart } }
    }).then(v => v || 0),
    Booking.sum('total_price', {
      where: { status: 'USED', booking_time: { [Op.gte]: lastMonthStart, [Op.lt]: thisMonthStart } }
    }).then(v => v || 0),
  ]);

  // CỘNG ĐỦ 3 TRẠNG THÁI CHO TỪNG THÁNG
  const revenueThisMonth = revenueSuccessThisMonth + revenueNoShowThisMonth + revenueUsedThisMonth;
  const revenueLastMonth = revenueSuccessLastMonth + revenueNoShowLastMonth + revenueUsedLastMonth;

  const revenueTrend = revenueLastMonth > 0
    ? parseFloat((((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100).toFixed(1))
    : null;

  // ─────────────────────────────────────────────────────────────
  // 3. DOANH THU 6 THÁNG GẦN NHẤT – tách SUCCESS / NO_SHOW theo tháng
  // ─────────────────────────────────────────────────────────────
  const [monthlySuccessRaw, monthlyNoShowRaw, monthlyUsedRaw] = await Promise.all([
    Booking.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('booking_time')), 'month'],
        [fn('SUM', col('total_price')), 'revenue'],
        [fn('COUNT', col('booking_id')), 'bookingCount'],
      ],
      where: { status: 'SUCCESS', booking_time: { [Op.gte]: sixMonthsAgo, [Op.ne]: null } },
      group: [fn('DATE_TRUNC', 'month', col('booking_time'))],
      order: [[fn('DATE_TRUNC', 'month', col('booking_time')), 'ASC']],
      raw: true,
    }),
    Booking.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('booking_time')), 'month'],
        [fn('SUM', col('total_price')), 'revenue'],
        [fn('COUNT', col('booking_id')), 'bookingCount'],
      ],
      where: { status: 'NO_SHOW', booking_time: { [Op.gte]: sixMonthsAgo, [Op.ne]: null } },
      group: [fn('DATE_TRUNC', 'month', col('booking_time'))],
      order: [[fn('DATE_TRUNC', 'month', col('booking_time')), 'ASC']],
      raw: true,
    }),
    Booking.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('booking_time')), 'month'],
        [fn('SUM', col('total_price')), 'revenue'],
        [fn('COUNT', col('booking_id')), 'bookingCount'],
      ],
      where: { status: 'USED', booking_time: { [Op.gte]: sixMonthsAgo, [Op.ne]: null } },
      group: [fn('DATE_TRUNC', 'month', col('booking_time'))],
      order: [[fn('DATE_TRUNC', 'month', col('booking_time')), 'ASC']],
      raw: true,
    }),
  ]);


  const monthlyMap = {};
  monthlySuccessRaw.forEach(r => {
    const key = r.month;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, revenueSuccess: 0, revenueNoShow: 0, revenueUsed: 0, bookingCount: 0 };
    monthlyMap[key].revenueSuccess  = parseInt(r.revenue, 10) || 0;
    monthlyMap[key].bookingCount   += parseInt(r.bookingCount, 10) || 0;
  });
  monthlyNoShowRaw.forEach(r => {
    const key = r.month;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, revenueSuccess: 0, revenueNoShow: 0, revenueUsed: 0, bookingCount: 0 };
    monthlyMap[key].revenueNoShow   = parseInt(r.revenue, 10) || 0;
    monthlyMap[key].bookingCount   += parseInt(r.bookingCount, 10) || 0;
  });
  monthlyUsedRaw.forEach(r => {
    const key = r.month;
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, revenueSuccess: 0, revenueNoShow: 0, revenueUsed: 0, bookingCount: 0 };
    monthlyMap[key].revenueUsed   = parseInt(r.revenue, 10) || 0;
    monthlyMap[key].bookingCount   += parseInt(r.bookingCount, 10) || 0;
  });

  const monthlyRevenue = Object.values(monthlyMap)
    .map(r => ({
      month: r.month,
      revenue: r.revenueSuccess + r.revenueNoShow + r.revenueUsed,
      revenueSuccess: r.revenueSuccess,
      revenueNoShow: r.revenueNoShow,
      revenueUsed: r.revenueUsed,
      bookingCount: r.bookingCount,
    }))
    .sort((a, b) => new Date(a.month) - new Date(b.month));

  // ─────────────────────────────────────────────────────────────
  // 4. TỔNG BOOKING & PHÂN BỔ TRẠNG THÁI
  // ─────────────────────────────────────────────────────────────
  const bookings = await Booking.findAll({ attributes: ['status'], raw: true });

  const totalBookings = bookings.length;
  let cancelledBookings = 0;
  const statusBreakdown = { PENDING: 0, SUCCESS: 0, CANCELLED: 0, NO_SHOW: 0, USED: 0 };

  bookings.forEach(b => {
    if (b.status in statusBreakdown) statusBreakdown[b.status] += 1;
    if (b.status === 'CANCELLED') cancelledBookings += 1;
  });

  const cancelRate = totalBookings > 0
    ? parseFloat(((cancelledBookings / totalBookings) * 100).toFixed(2))
    : 0;

  // ─────────────────────────────────────────────────────────────
  // 5. TỶ LỆ LẤP ĐẦY GHẾ
  // ─────────────────────────────────────────────────────────────
  const [showtimes, bookedTicketsCount] = await Promise.all([
    Showtime.findAll({
      include: [{ model: Room, as: 'room', attributes: ['capacity'] }],
      raw: true,
      nest: true,
    }),
    Ticket.count({ where: { status: 'BOOKED' } }),
  ]);

  const totalCapacity = showtimes.reduce((sum, st) => sum + (st.room?.capacity || 0), 0);
  const occupancyRate = totalCapacity > 0
    ? parseFloat(((bookedTicketsCount / totalCapacity) * 100).toFixed(2))
    : 0;

  // ─────────────────────────────────────────────────────────────
  // 6. TOP 5 PHIM BÁN CHẠY
  //    Dùng GROUP BY thẳng trên DB – không load toàn bộ tickets về JS
  //    FIX: attributes:[] trên Showtime làm nested Movie không join được
  // ─────────────────────────────────────────────────────────────
  const topMoviesRaw = await Ticket.findAll({
    where: { status: 'BOOKED' },
    attributes: [
      [fn('COUNT', col('Ticket.ticket_id')), 'ticket_count'],
      [fn('SUM',   col('Ticket.price')),     'revenue'],
    ],
    include: [{
      model: Showtime,
      as: 'showtime',
      attributes: [],          // không cần cột của showtime
      required: true,
      include: [{
        model: Movie,
        as: 'movie',
        attributes: ['id', 'title', 'posterUrl'],
        required: true,
      }],
    }],
    group: [
      'showtime->movie.id',
      'showtime->movie.title',
      'showtime->movie."posterUrl"',
    ],
    order: [[fn('COUNT', col('Ticket.ticket_id')), 'DESC']],
    limit: 5,
    subQuery: false,
    raw: true,
    nest: true,
  });

  const topMovies = topMoviesRaw.map(r => ({
    id:           r.showtime.movie.id,
    title:        r.showtime.movie.title,
    posterUrl:    r.showtime.movie.posterUrl,
    ticket_count: parseInt(r.ticket_count, 10) || 0,
    revenue:      parseInt(r.revenue, 10)       || 0,
  }));

  // ─────────────────────────────────────────────────────────────
  // 7. TOP 5 PHIM ĐÁNH GIÁ CAO NHẤT
  // ─────────────────────────────────────────────────────────────
  const allComments = await Comment.findAll({
    attributes: ['movie_id', 'rating'],
    include: [{ model: Movie, as: 'movie', attributes: ['id', 'title', 'posterUrl'] }],
  });

  const ratingStats = {};
  allComments.forEach(c => {
    const movieId = c.movie_id;
    if (!ratingStats[movieId]) {
      ratingStats[movieId] = { id: movieId, title: c.movie?.title, posterUrl: c.movie?.posterUrl, totalRating: 0, count: 0 };
    }
    ratingStats[movieId].totalRating += Number(c.rating || 0);
    ratingStats[movieId].count += 1;
  });

  const topRatedMovies = Object.values(ratingStats)
    .map(m => ({
      id: m.id,
      title: m.title,
      posterUrl: m.posterUrl,
      averageRating: parseFloat((m.totalRating / m.count).toFixed(1)),
      reviewCount: m.count,
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
    .slice(0, 5);

  // ─────────────────────────────────────────────────────────────
  // 8. THỐNG KÊ NGƯỜI DÙNG
  // ─────────────────────────────────────────────────────────────
  const [totalUsers, newUsersThisMonth] = await Promise.all([
    User.count({ where: { role: 'USER' } }),
    User.count({ where: { role: 'USER', createdAt: { [Op.gte]: thisMonthStart } } }),
  ]);

  // ─────────────────────────────────────────────────────────────
  // 9. RETURN
  // ─────────────────────────────────────────────────────────────
  return {
    // Doanh thu tổng (tích lũy)
    totalRevenue,               // SUCCESS + NO_SHOW
    revenueSuccess,             // chỉ SUCCESS
    revenueNoShow,              // chỉ NO_SHOW
    revenueUsed,
    // Doanh thu tháng
    revenueThisMonth,           // tổng tháng này
    revenueSuccessThisMonth,    // SUCCESS tháng này
    revenueNoShowThisMonth,     // NO_SHOW tháng này
    revenueUsedThisMonth,       // USED tháng này
    revenueLastMonth,           // tổng tháng trước
    revenueSuccessLastMonth,
    revenueNoShowLastMonth,
    revenueUsedLastMonth,
    revenueTrend,               // % MoM (null nếu tháng trước = 0)

    // Biểu đồ 6 tháng: [{month, revenue, revenueSuccess, revenueNoShow, revenueUsed, bookingCount}]
    monthlyRevenue,

    // Booking
    totalBookings,
    statusBreakdown,            // { PENDING, SUCCESS, CANCELLED, NO_SHOW, USED }
    cancelRate,

    // Ghế
    occupancyRate,

    // Phim
    topMovies,
    topRatedMovies,

    // Người dùng
    totalUsers,
    newUsersThisMonth,
  };
};