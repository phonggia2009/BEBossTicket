const models = require('../models');
const { Showtime, Movie, Room, Cinema, ShowtimePrice, Booking, User } = models;
const sequelize = models.sequelize || Showtime.sequelize;
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const mailer = require('../utils/mailer');

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

const buildChangeNotificationEmail = ({
  userName,
  bookingId,
  movieTitle,
  oldTimeFormatted,
  newTimeFormatted,
  oldRoomName,
  newRoomName,
  isTimeChanged,
  isRoomChanged
}) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
    <div style="background-color: #e50914; padding: 20px; text-align: center; color: #fff;">
      <h2 style="margin: 0; text-transform: uppercase;">Thông báo thay đổi lịch chiếu</h2>
    </div>
    <div style="padding: 20px;">
      <p>Chào <b>${userName}</b>,</p>
      <p>
        Hệ thống BossTicket xin trân trọng thông báo suất chiếu phim <b>${movieTitle}</b>
        mà bạn đã đặt vé (Mã đơn hàng: <b>${bookingId}</b>) vừa có sự thay đổi từ rạp chiếu:
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Thông tin</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Lịch cũ</th>
            <th style="padding: 12px; border: 1px solid #ddd; text-align: left;">Lịch mới cập nhật</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Thời gian chiếu</td>
            <td style="padding: 12px; border: 1px solid #ddd; ${isTimeChanged ? 'text-decoration: line-through; color: #999;' : ''}">${oldTimeFormatted}</td>
            <td style="padding: 12px; border: 1px solid #ddd; ${isTimeChanged ? 'color: #e50914; font-weight: bold;' : ''}">${newTimeFormatted}</td>
          </tr>
          <tr>
            <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Phòng chiếu</td>
            <td style="padding: 12px; border: 1px solid #ddd; ${isRoomChanged ? 'text-decoration: line-through; color: #999;' : ''}">${oldRoomName}</td>
            <td style="padding: 12px; border: 1px solid #ddd; ${isRoomChanged ? 'color: #e50914; font-weight: bold;' : ''}">${newRoomName}</td>
          </tr>
        </tbody>
      </table>

      <p>Rất mong quý khách thông cảm vì sự bất tiện này. Quý khách vui lòng kiểm tra lại thông tin vé trong mục "Của tôi" trên website.</p>
      <p>Trân trọng,<br/><b>Đội ngũ BossTicket</b></p>
    </div>
  </div>
`;

// --- MAIN SERVICES ---

exports.getShowtimes = async (page = 1, limit = 15, filters = {}) => {
  const offset = (page - 1) * limit;
  const { movieId, roomId, cinemaId, date } = filters;

  const whereClause = {};

  if (movieId) whereClause.movie_id = movieId;

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

  if (movie.releaseDate) {
    const releaseDate = moment.tz(movie.releaseDate, 'Asia/Ho_Chi_Minh').startOf('day');
    const showDate = moment.tz(start_time, 'Asia/Ho_Chi_Minh').startOf('day');
    
    if (showDate.isBefore(releaseDate)) {
      throw new Error('INVALID_START_TIME');
    }
  }

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

  // BƯỚC 1: Lấy thông tin cũ trước khi cập nhật
  const oldShowtime = await Showtime.findByPk(id, {
    include: [
      { model: Movie, as: 'movie' },
      { model: Room, as: 'room' }
    ]
  });
  if (!oldShowtime) throw new Error('SHOWTIME_NOT_FOUND');

  // BƯỚC 2: Snapshot thông tin cũ để dùng sau khi đã update
  const oldStartTime = oldShowtime.start_time;
  const oldRoomName = oldShowtime.room.room_name;
  const movieTitle = oldShowtime.movie.title;

  // BƯỚC 3: Phát hiện thay đổi
  const isTimeChanged = new Date(startTimeUTC).getTime() !== new Date(oldStartTime).getTime();
  const isRoomChanged = Number(room_id) !== Number(oldShowtime.room_id);

  // BƯỚC 4: Validate movie
  const movie = await Movie.findByPk(movie_id);
  if (!movie) throw new Error('MOVIE_NOT_FOUND');

  if (movie.releaseDate) {
    const releaseDate = moment.tz(movie.releaseDate, 'Asia/Ho_Chi_Minh').startOf('day');
    const showDate = moment.tz(start_time, 'Asia/Ho_Chi_Minh').startOf('day');
    if (showDate.isBefore(releaseDate)) throw new Error('INVALID_START_TIME');
  }

  // BƯỚC 5: Transaction - chỉ chứa thao tác DB, không chứa logic email
  const t = await sequelize.transaction();
  try {
    await oldShowtime.update(
      { movie_id, room_id, start_time: startTimeUTC },
      { transaction: t }
    );

    if (seat_prices && Array.isArray(seat_prices) && seat_prices.length > 0) {
      await ShowtimePrice.destroy({ where: { showtime_id: id }, transaction: t });

      const pricesData = seat_prices.map(item => ({
        showtime_id: id,
        seat_type: item.seat_type,
        price: item.price
      }));
      await ShowtimePrice.bulkCreate(pricesData, { transaction: t });
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  // BƯỚC 6: Lấy thông tin mới sau khi commit (nằm ngoài try/catch của transaction)
  const updatedShowtime = await Showtime.findByPk(id, { include: showtimeInclude });

  // BƯỚC 7: Gửi email thông báo nếu có thay đổi giờ hoặc phòng chiếu
  if (isTimeChanged || isRoomChanged) {
    const bookings = await Booking.findAll({
      where: {
        showtime_id: id,
        status: { [Op.in]: ['SUCCESS', 'PENDING'] }
      },
      include: [{ model: User, as: 'user' }]
    });

    if (bookings.length > 0) {
      const oldTimeFormatted = moment.tz(oldStartTime, 'Asia/Ho_Chi_Minh').format('HH:mm - DD/MM/YYYY');
      const newTimeFormatted = moment.tz(updatedShowtime.start_time, 'Asia/Ho_Chi_Minh').format('HH:mm - DD/MM/YYYY');
      const newRoomName = updatedShowtime.room.room_name;

      // FIX: Dùng Promise.all + await để đảm bảo tất cả email được gửi
      // và lỗi không bị nuốt im lặng
      const emailPromises = bookings
        .filter(booking => booking.user?.email)
        .map(booking => {
          const mailContent = buildChangeNotificationEmail({
            userName: booking.user.full_name || 'Quý khách',
            bookingId: booking.id,
            movieTitle,
            oldTimeFormatted,
            newTimeFormatted,
            oldRoomName,
            newRoomName,
            isTimeChanged,
            isRoomChanged
          });

          return mailer.sendEmail(
            booking.user.email,
            `[BossTicket] Thay đổi lịch chiếu phim: ${movieTitle}`,
            mailContent
          );
        });

      // Dùng allSettled để một email lỗi không làm hỏng toàn bộ batch
      const results = await Promise.allSettled(emailPromises);

      const failedCount = results.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.error(`[updateShowtime] ${failedCount}/${results.length} email(s) failed for showtime #${id}`);
        results
          .filter(r => r.status === 'rejected')
          .forEach(r => console.error('[updateShowtime] Email error:', r.reason));
      }
    }
  }

  return updatedShowtime;
};


exports.deleteShowtime = async (id) => {
  const showtime = await Showtime.findByPk(id, {
    include: [{ model: Movie, as: 'movie', attributes: ['duration'] }]
  });
  if (!showtime) throw new Error('SHOWTIME_NOT_FOUND');
 
  const BUFFER_MINUTES = 30;
  const movieDuration  = showtime.movie?.duration || 0;
 
  const allowDeleteAt = new Date(
    new Date(showtime.start_time).getTime() +
    (movieDuration + BUFFER_MINUTES) * 60 * 1000
  );
  const isShowtimeOver = new Date() > allowDeleteAt;
 
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
 
  await showtime.destroy();
};


exports.getShowtimesByMovie = async (movieId, date) => {
  const movie = await Movie.findByPk(movieId);
  if (!movie) throw new Error('MOVIE_NOT_FOUND');

  const whereCondition = { movie_id: movieId };

  if (date) {
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