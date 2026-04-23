const { Booking, Ticket, Showtime, Movie, Room,Comment, sequelize } = require('../models');
const { Op } = require('sequelize');

exports.getDashboardStats = async () => {
  const totalRevenue = await Booking.sum('total_price', {
      status: ['SUCCESS', 'NO_SHOW'] 
  }) || 0;

  // 2. TỔNG BOOKING & PHÂN BỔ TRẠNG THÁI
  const bookings = await Booking.findAll({
    attributes: ['status'],
    raw: true
  });

  let totalBookings = bookings.length;
  let cancelledBookings = 0;
  const statusBreakdown = { PENDING: 0, SUCCESS: 0, CANCELLED: 0 };

  bookings.forEach(b => {
    if (statusBreakdown[b.status] !== undefined) {
      statusBreakdown[b.status] += 1;
    }
    if (b.status === 'CANCELLED') cancelledBookings += 1;
  });

  // 3. TỶ LỆ HỦY ĐƠN
  const cancelRate = totalBookings > 0 
    ? ((cancelledBookings / totalBookings) * 100).toFixed(2) 
    : 0;

  // 4. TỶ LỆ LẤP ĐẦY GHẾ (Occupancy Rate)
  // Tổng số ghế của TẤT CẢ các suất chiếu đã tạo
  const showtimes = await Showtime.findAll({
    include: [{ model: Room, as: 'room', attributes: ['capacity'] }],
    raw: true,
    nest: true
  });
  const totalCapacity = showtimes.reduce((sum, st) => sum + (st.room?.capacity || 0), 0);
  
  // Tổng số vé đã đặt (chỉ tính ghế bị giữ/đã bán)
  const bookedTicketsCount = await Ticket.count({
    where: { status: 'BOOKED' }
  });
  const occupancyRate = totalCapacity > 0 
    ? ((bookedTicketsCount / totalCapacity) * 100).toFixed(2) 
    : 0;

  // 5. TOP PHIM BÁN CHẠY (Theo số lượng vé và doanh thu)
  const tickets = await Ticket.findAll({
    where: { status: 'BOOKED' },
    include: [{
      model: Showtime,
      as: 'showtime',
      include: [{ model: Movie, as: 'movie', attributes: ['id', 'title', 'posterUrl'] }]
    }]
  });

  const allComments = await Comment.findAll({
    include: [{ model: Movie, as: 'movie', attributes: ['id', 'title', 'posterUrl'] }]
  });

  const ratingStats = {};
  allComments.forEach(c => {
    const movieId = c.movie_id;
    if (!ratingStats[movieId]) {
      ratingStats[movieId] = {
        id: movieId,
        title: c.movie?.title,
        posterUrl: c.movie?.posterUrl,
        totalRating: 0,
        count: 0
      };
    }
    ratingStats[movieId].totalRating += Number(c.rating || 0);
    ratingStats[movieId].count += 1;
  });

  // Tính trung bình, sắp xếp và lấy Top 5
  const topRatedMovies = Object.values(ratingStats)
    .map(m => ({
      id: m.id,
      title: m.title,
      posterUrl: m.posterUrl,
      averageRating: (m.totalRating / m.count).toFixed(1),
      reviewCount: m.count
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount)
    .slice(0, 5);



  const movieStats = {};
  tickets.forEach(t => {
    const movie = t.showtime?.movie;
    if (movie) {
      if (!movieStats[movie.id]) {
        movieStats[movie.id] = {
          id: movie.id,
          title: movie.title,
          posterUrl: movie.posterUrl,
          ticket_count: 0,
          revenue: 0
        };
      }
      movieStats[movie.id].ticket_count += 1;
      movieStats[movie.id].revenue += t.price;
    }
  });

  

  // Chuyển object thành mảng, sắp xếp theo số lượng vé giảm dần và lấy Top 5
  const topMovies = Object.values(movieStats)
    .sort((a, b) => b.ticket_count - a.ticket_count)
    .slice(0, 5);

  return {
    totalRevenue,
    totalBookings,
    statusBreakdown,
    cancelRate: parseFloat(cancelRate),
    occupancyRate: parseFloat(occupancyRate),
    topMovies,
    topRatedMovies
  };
};