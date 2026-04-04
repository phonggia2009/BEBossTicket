const models = require('../models');
const { Showtime, Movie, Room, Cinema, ShowtimePrice,Booking } = models;
const sequelize = models.sequelize || Showtime.sequelize;
const { Op } = require('sequelize');
const moment = require('moment-timezone');


const showtimeInclude = [
  { model: Movie, as: 'movie', attributes: ['id', 'title', 'duration', 'posterUrl', 'rating'] },
  { model: ShowtimePrice, as: 'seat_prices', attributes: ['seat_type', 'price'] },
  {
    model: Room,
    as: 'room',
    attributes: ['id', 'room_name', 'capacity'],
    include: [{ model: Cinema, as: 'cinema', attributes: ['id', 'cinema_name', 'city', 'address'] }]
  }
];

// --- HELPER: Kiểm tra xung đột lịch chiếu ---
const findConflict = async (roomId, startTime, durationMinutes, excludeId = null) => {
  const BUFFER_MINUTES = 15;
  const startDate = new Date(startTime);
  const endDate = new Date(startDate.getTime() + (durationMinutes + BUFFER_MINUTES) * 60000);

  const whereClause = {
    room_id: roomId,
    start_time: { [Op.lt]: endDate }
  };

  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId };
  }

  const candidates = await Showtime.findAll({
    where: whereClause,
    include: [{ model: Movie, as: 'movie', attributes: ['id', 'title', 'duration'] }]
  });

  const conflict = candidates.find(s => {
    const existingEnd = new Date(
      new Date(s.start_time).getTime() + (s.movie.duration + BUFFER_MINUTES) * 60000
    );
    return existingEnd > startDate;
  });

  return conflict || null;
};

// --- MAIN SERVICES ---

exports.getShowtimes = async (page = 1, limit = 15, filters = {}) => {
  const offset = (page - 1) * limit;
  const { movieId, roomId, cinemaId, date } = filters;

  const whereClause = {};

  if (movieId) whereClause.movie_id = movieId;

  // --- FIX 1: XỬ LÝ LỌC THEO RẠP (CINEMA) ---
  if (roomId) {
    whereClause.room_id = roomId;
  } else if (cinemaId) {
    const roomsInCinema = await Room.findAll({ 
      where: { cinema_id: cinemaId }, 
      attributes: ['id'] 
    });
    const roomIds = roomsInCinema.map(r => r.id);
    whereClause.room_id = { [Op.in]: roomIds };
  }

  // --- FIX 2: XỬ LÝ LỌC THEO NGÀY (ĐỒNG BỘ TIMEZONE) ---
  if (date) {
    const startOfDay = moment.tz(date, "Asia/Ho_Chi_Minh").startOf('day').toDate();
    const endOfDay = moment.tz(date, "Asia/Ho_Chi_Minh").endOf('day').toDate();
    whereClause.start_time = { [Op.between]: [startOfDay, endOfDay] };
  }

  const { count, rows } = await Showtime.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['start_time', 'ASC']],
    include: [
      { model: Movie, as: 'movie', attributes: ['id', 'title', 'duration', 'posterUrl', 'rating'] },
      { model: ShowtimePrice, as: 'seat_prices', attributes: ['seat_type', 'price'] },
      { 
        model: Room, 
        as: 'room', 
        attributes: ['id', 'room_name', 'capacity'], 
        include: [
          {
            model: Cinema,
            as: 'cinema',
            attributes: ['id', 'cinema_name', 'city', 'address']
          }
        ] 
      }
    ],
    distinct: true
  });

  return {
    showtimes: rows,
    pagination: { totalItems: count, totalPages: Math.ceil(count / limit), currentPage: page }
  };
};

exports.getShowtimeById = async (id) => {
  const showtime = await Showtime.findByPk(id, { include: showtimeInclude });
  if (!showtime) throw new Error('SHOWTIME_NOT_FOUND');
  return showtime;
};

exports.createShowtime = async (data) => {
  const { movie_id, room_id, start_time, seat_prices } = data;
  const startTimeUTC = moment.tz(start_time, 'Asia/Ho_Chi_Minh').utc().toDate();
  if (!seat_prices || !Array.isArray(seat_prices) || seat_prices.length === 0) {
    throw new Error('MISSING_PRICES');
  }

  const movie = await Movie.findByPk(movie_id);
  if (!movie) throw new Error('MOVIE_NOT_FOUND');

  // --- THÊM CHECK NGÀY KHỞI CHIẾU ---
  if (movie.releaseDate) {
    // So sánh ngày chiếu (bỏ qua giờ) với ngày khởi chiếu
    const releaseDate = moment.tz(movie.releaseDate, 'Asia/Ho_Chi_Minh').startOf('day');
    const showDate = moment.tz(start_time, 'Asia/Ho_Chi_Minh').startOf('day');
    
    if (showDate.isBefore(releaseDate)) {
      throw new Error('INVALID_START_TIME');
    }
  }

  // Sử dụng Transaction
  const t = await sequelize.transaction();
  try {
    const newShowtime = await Showtime.create({
      movie_id,
      room_id,
      start_time: startTimeUTC,
      price: seat_prices[0].price
    }, { transaction: t });

    const pricesData = seat_prices.map(item => ({
      showtime_id: newShowtime.id,
      seat_type: item.seat_type,
      price: item.price
    }));

    await ShowtimePrice.bulkCreate(pricesData, { transaction: t });
    await t.commit(); 

    return await Showtime.findByPk(newShowtime.id, { include: showtimeInclude });
  } catch (error) {
    await t.rollback(); 
    throw error;
  }
};

exports.updateShowtime = async (id, data) => {
  const { movie_id, room_id, start_time, seat_prices } = data;
  const startTimeUTC = moment.tz(start_time, 'Asia/Ho_Chi_Minh').utc().toDate();
  const showtime = await Showtime.findByPk(id);
  if (!showtime) throw new Error('SHOWTIME_NOT_FOUND');

  // --- LẤY THÔNG TIN PHIM VÀ THÊM CHECK NGÀY KHỞI CHIẾU ---
  const movie = await Movie.findByPk(movie_id);
  if (!movie) throw new Error('MOVIE_NOT_FOUND');

  if (movie.releaseDate) {
    const releaseDate = moment.tz(movie.releaseDate, 'Asia/Ho_Chi_Minh').startOf('day');
    const showDate = moment.tz(start_time, 'Asia/Ho_Chi_Minh').startOf('day');
    
    if (showDate.isBefore(releaseDate)) {
      throw new Error('INVALID_START_TIME');
    }
  }

  const t = await sequelize.transaction();
  try {
    await showtime.update({ movie_id, room_id, start_time: startTimeUTC }, { transaction: t });

    if (seat_prices && Array.isArray(seat_prices)) {
      await ShowtimePrice.destroy({ where: { showtime_id: id }, transaction: t });
      
      const pricesData = seat_prices.map(item => ({
        showtime_id: id,
        seat_type: item.seat_type,
        price: item.price
      }));
      await ShowtimePrice.bulkCreate(pricesData, { transaction: t });
    }

    await t.commit();
    return await Showtime.findByPk(id, { include: showtimeInclude });
  } catch (error) {
    await t.rollback();
    throw error;
  }
};


exports.deleteShowtime = async (id) => {
  const showtime = await Showtime.findByPk(id, {
    include: [{ model: Movie, as: 'movie', attributes: ['duration'] }]
  });
  if (!showtime) throw new Error('SHOWTIME_NOT_FOUND');
 
  const BUFFER_MINUTES = 30;
  const movieDuration  = showtime.movie?.duration || 0;
 
  // Thời điểm được phép xóa = start_time + duration + 30 phút buffer
  const allowDeleteAt = new Date(
    new Date(showtime.start_time).getTime() +
    (movieDuration + BUFFER_MINUTES) * 60 * 1000
  );
  const isShowtimeOver = new Date() > allowDeleteAt;
 
  // Nếu phim chưa chiếu xong -> kiem tra booking
  if (!isShowtimeOver) {
    const activeBookingCount = await Booking.count({
      where: {
        showtime_id: id,
        status: { [Op.in]: ['PENDING', 'SUCCESS'] }
      }
    });
 
    if (activeBookingCount > 0) {
      const error = new Error('SHOWTIME_HAS_ACTIVE_BOOKINGS');
      error.count = activeBookingCount;
      error.allowDeleteAt = allowDeleteAt;
      throw error;
    }
  }
 
  // Soft delete
  await showtime.destroy();
};




exports.getShowtimesByMovie = async (movieId, date) => {
  // 1. Kiểm tra phim có tồn tại không
  const movie = await Movie.findByPk(movieId);
  if (!movie) throw new Error('MOVIE_NOT_FOUND');

  // 2. Xây dựng điều kiện lọc (Where Clause)
  const whereCondition = { movie_id: movieId };

  if (date) {
    // Ép múi giờ VN để lọc không bị lệch ngày
    const startOfDay = moment.tz(date, "Asia/Ho_Chi_Minh").startOf('day').toDate();
    const endOfDay = moment.tz(date, "Asia/Ho_Chi_Minh").endOf('day').toDate();
    
    whereCondition.start_time = {
      [Op.between]: [startOfDay, endOfDay]
    };
  } else {
    whereCondition.start_time = {
      [Op.gte]: new Date()
    };
  }

  // 3. Truy vấn dữ liệu kèm thông tin Phòng, Rạp và Giá vé
  const showtimes = await Showtime.findAll({
    where: whereCondition,
    include: [
      {
        model: Room,
        as: 'room',
        attributes: ['id', 'room_name'],
        include: [
          {
            model: Cinema,
            as: 'cinema',
            attributes: ['id', 'cinema_name', 'address', 'city']
          }
        ]
      },
      // Bổ sung bảng giá để giao diện hiển thị đúng giá tiền
      {
        model: ShowtimePrice,
        as: 'seat_prices',
        attributes: ['seat_type', 'price']
      }
    ],
    order: [['start_time', 'ASC']]
  });

  return showtimes;
};

exports.getShowtimesByRoom = async (roomId, date) => {
  const room = await Room.findByPk(roomId);
  if (!room) throw new Error('ROOM_NOT_FOUND');

  const whereClause = { room_id: roomId };
  if (date) {
    const startOfDay = new Date(date);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    whereClause.start_time = { [Op.between]: [startOfDay, endOfDay] };
  }

  return await Showtime.findAll({
    where: whereClause,
    order: [['start_time', 'ASC']],
    include: [
      { model: Movie, as: 'movie', attributes: ['id', 'title', 'duration', 'posterUrl'] },
      { model: ShowtimePrice, as: 'seat_prices', attributes: ['seat_type', 'price'] }
    ]
  });
};

exports.checkConflict = async (movieId, roomId, startTime, excludeId) => {
  if (!movieId || !roomId || !startTime) {
    throw new Error('MISSING_CONFLICT_INFO');
  }

  const movie = await Movie.findByPk(movieId, { attributes: ['id', 'duration'] });
  if (!movie) throw new Error('MOVIE_NOT_FOUND');

  const conflict = await findConflict(roomId, startTime, movie.duration, excludeId || null);
  
  return {
    hasConflict: !!conflict,
    conflict: conflict ? {
      showtime_id: conflict.id,
      movie_title: conflict.movie.title,
      start_time: conflict.start_time,
      duration: conflict.movie.duration
    } : null
  };
};


