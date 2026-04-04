const { Movie, Genre, Showtime, Booking } = require('../models');
const { Op, fn, col, where, Sequelize } = require('sequelize');
const { cloudinary } = require('../config/cloudinary');

// --- HELPER FUNCTIONS ---
const getPublicId = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const folderAndFile = parts.slice(-2).join('/'); 
  return folderAndFile.split('.')[0]; 
};

// --- MAIN SERVICES ---

exports.getSuggestedVideos = async () => {
  const movies = await Movie.findAll({
    where: {
      trailerUrl: { 
        [Op.not]: null,
        [Op.ne]: '' 
      }
    },
    order: Sequelize.literal('RANDOM()'), 
    limit: 5,
    attributes: ['id', 'title', 'trailerUrl', 'posterUrl'] // Chỉ lấy những thông tin cần thiết
  });

  return movies;
};

// services/movie.service.js

exports.getMovies = async (page = 1, limit = 10, status) => { 
  const offset = (page - 1) * limit;

  // Xây dựng điều kiện lọc
  const whereClause = {};

  if (status === 'now-showing') {
    // Phim ĐANG CHIẾU: Ngày khởi chiếu nhỏ hơn hoặc bằng thời điểm hiện tại
    whereClause.releaseDate = { [Op.lte]: new Date() };
  } else if (status === 'upcoming') {
    // Phim SẮP CHIẾU: Ngày khởi chiếu lớn hơn thời điểm hiện tại
    whereClause.releaseDate = { [Op.gt]: new Date() };
  }

  const { count, rows } = await Movie.findAndCountAll({
    where: whereClause, // Đưa điều kiện lọc vào query
    limit: Number(limit), 
    offset: Number(offset),
    order: [['releaseDate', 'DESC']], // Nên xếp theo ngày khởi chiếu mới nhất lên đầu
    distinct: true,
    include: {
      model: Genre,
      as: 'genres',
      attributes: ['id', 'name'],
      through: { attributes: [] }
    }
  });

  return {
    movies: rows,
    pagination: { 
      totalItems: count, 
      totalPages: Math.ceil(count / limit), 
      currentPage: Number(page) 
    }
  };
};

exports.getMovieDetail = async (id) => {
  const movie = await Movie.findByPk(id, {
    include: {
      model: Genre,
      as: 'genres', 
      attributes: ['id', 'name'],
      through: { attributes: [] }
    }
  });

  if (!movie) throw new Error('MOVIE_NOT_FOUND');

  return movie;
};

exports.searchMovies = async (query = '') => {
  return await Movie.findAll({
    where: where(
      fn('unaccent', col('Movie.title')), 
      {
        [Op.iLike]: fn('unaccent', `%${query}%`) 
      }
    ),
    include: { 
      model: Genre, 
      as: 'genres', 
      attributes: ['id', 'name'], 
      through: { attributes: [] } 
    }
  });
};

exports.createMovie = async (movieData, files) => {
  const { title, description, releaseDate, trailerUrl, genreIds, duration, rating } = movieData;

  const posterUrl = files && files['image'] ? files['image'][0].path : null;
  const bannerUrls = files && files['banners'] ? files['banners'].map(file => file.path) : [];

  const newMovie = await Movie.create({
    title, 
    description, 
    releaseDate, 
    trailerUrl,
    duration,
    rating,
    posterUrl,
    banners: bannerUrls
  });

  if (genreIds) {
    await newMovie.addGenres(Array.isArray(genreIds) ? genreIds : genreIds.split(','));
  }

  return await Movie.findByPk(newMovie.id, {
    include: { model: Genre, as: 'genres', attributes: ['id', 'name'], through: { attributes: [] } }
  });
};

exports.updateMovie = async (id, updateData, files) => {
  const { genreIds, remainingBanners, ...updateFields } = updateData;
  const movie = await Movie.findByPk(id);

  if (!movie) throw new Error('MOVIE_NOT_FOUND');

  // 1. Xử lý Poster
  if (files && files['image']) {
    if (movie.posterUrl) {
      try {
        await cloudinary.uploader.destroy(getPublicId(movie.posterUrl));
      } catch (err) { console.error("Lỗi xóa poster:", err); }
    }
    updateFields.posterUrl = files['image'][0].path;
  }

  // 2. Xử lý Banners
  const currentBannersInDb = movie.banners || [];
  let keptBanners = [];
  if (remainingBanners) {
    keptBanners = Array.isArray(remainingBanners) ? remainingBanners : [remainingBanners];
  }

  const bannersToDelete = currentBannersInDb.filter(url => !keptBanners.includes(url));

  for (const url of bannersToDelete) {
    try {
      const publicId = getPublicId(url);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
        console.log("Đã xóa banner trên Cloudinary:", publicId);
      }
    } catch (err) {
      console.error("Lỗi khi xóa banner cũ trên Cloudinary:", err);
    }
  }

  const newUploadedBanners = files && files['banners'] 
    ? files['banners'].map(file => file.path) 
    : [];

  updateFields.banners = [...keptBanners, ...newUploadedBanners];

  // 3. Cập nhật Database
  await movie.update(updateFields);

  if (genreIds) {
    const ids = Array.isArray(genreIds) ? genreIds : genreIds.split(',');
    await movie.setGenres(ids);
  }

  return await Movie.findByPk(id, {
    include: { model: Genre, as: 'genres', attributes: ['id', 'name'], through: { attributes: [] } }
  });
};

exports.assignGenres = async (id, genreIds) => {
  const movie = await Movie.findByPk(id);
  if (!movie) throw new Error('MOVIE_NOT_FOUND');
  if (!Array.isArray(genreIds)) throw new Error('INVALID_GENRE_FORMAT');

  await movie.setGenres(genreIds);

  return await Movie.findByPk(id, {
    include: {
      model: Genre,
      as: 'genres',
      attributes: ['id', 'name'],
      through: { attributes: [] }
    }
  });
};

exports.deleteMovie = async (id) => {
  const movie = await Movie.findByPk(id);
  if (!movie) throw new Error('MOVIE_NOT_FOUND');
  
  // --- THÊM LOGIC KIỂM TRA LỊCH CHIẾU ---
  // Tìm xem có suất chiếu nào của phim này ở hiện tại hoặc tương lai không
  const activeShowtimesCount = await Showtime.count({
    where: {
      movie_id: id,
      start_time: {
        [Op.gt]: new Date() // Chỉ chặn nếu có lịch chiếu chưa diễn ra
      }
    }
  });

  if (activeShowtimesCount > 0) {
    throw new Error('MOVIE_HAS_ACTIVE_SHOWTIMES');
  }


  await movie.destroy();
  return true;
};

exports.getTrash = async () => {
  return await Movie.findAll({
    where: { deletedAt: { [Op.ne]: null } },
    paranoid: false
  });
};

exports.restoreMovie = async (id) => {
  const movie = await Movie.findByPk(id, { paranoid: false });
  if (!movie) throw new Error('MOVIE_NOT_IN_TRASH');
  
  await movie.restore();
  return movie;
};

exports.getPersonalizedMovies = async (userId) => {
  // 1. Tìm các phim user đã đặt vé thành công
  const bookings = await Booking.findAll({
    where: { user_id: userId, status: 'SUCCESS' },
    include: [{
      model: Showtime,
      as: 'showtime',
      include: [{ 
        model: Movie, 
        as: 'movie', 
        include: [{ model: Genre, as: 'genres' }] 
      }]
    }]
  });

  // Nếu User chưa mua vé bao giờ -> Trả về phim ngẫu nhiên như cũ
  if (!bookings || bookings.length === 0) {
    return await exports.getSuggestedVideos();
  }

  // 2. Phân tích sở thích: Lấy danh sách ID phim đã xem và Đếm số lần xem của từng thể loại
  const watchedMovieIds = new Set();
  const genreCounts = {};

  bookings.forEach(b => {
    const movie = b.showtime?.movie;
    if (movie) {
      watchedMovieIds.add(movie.id);
      movie.genres.forEach(g => {
        genreCounts[g.id] = (genreCounts[g.id] || 0) + 1;
      });
    }
  });

  // Lấy ra Top 2 thể loại mà User xem nhiều nhất
  const topGenreIds = Object.keys(genreCounts)
    .sort((a, b) => genreCounts[b] - genreCounts[a])
    .slice(0, 2)
    .map(Number);

  // 3. Tìm phim CÙNG THỂ LOẠI, CHƯA XEM, và CÓ TRAILER
  let suggestions = await Movie.findAll({
    where: {
      id: { [Op.notIn]: Array.from(watchedMovieIds) }, // Loại bỏ phim đã xem
      trailerUrl: { [Op.not]: null, [Op.ne]: '' },
      // Ưu tiên phim mới ra mắt trong vòng 6 tháng gần đây
      releaseDate: { [Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 6)) }
    },
    include: [{
      model: Genre,
      as: 'genres',
      where: { id: { [Op.in]: topGenreIds } } // Thuộc Top 2 thể loại yêu thích
    }],
    limit: 5,
    attributes: ['id', 'title', 'trailerUrl', 'posterUrl']
  });

  // 4. Bù trừ: Nếu thuật toán không tìm đủ 5 phim (VD: web ít phim), lấy ngẫu nhiên bù vào
  if (suggestions.length < 5) {
    const excludeIds = [...Array.from(watchedMovieIds), ...suggestions.map(s => s.id)];
    const moreMovies = await Movie.findAll({
      where: {
        id: { [Op.notIn]: excludeIds },
        trailerUrl: { [Op.not]: null, [Op.ne]: '' }
      },
      order: Sequelize.literal('RANDOM()'),
      limit: 5 - suggestions.length,
      attributes: ['id', 'title', 'trailerUrl', 'posterUrl']
    });
    suggestions = [...suggestions, ...moreMovies];
  }

  return suggestions;
};