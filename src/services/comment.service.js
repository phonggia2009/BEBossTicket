const { Comment, User, Booking, Showtime } = require('../models');
const { Op } = require('sequelize');
const aiService = require('./ai.service');
// 1. Hàm kiểm tra quyền bình luận
exports.checkCanComment = async (userId, movieId) => {
  // Tìm xem có đơn hàng nào của User này thành công và thuộc về Phim này không
  const bookingCount = await Booking.count({
    where: { 
      user_id: userId,
      status: { [Op.in]: ['SUCCESS', 'PAID'] } // Bắt buộc phải là đơn đã thanh toán thành công
    },
    include: [{
      model: Showtime,
      as: 'showtime',
      where: { 
        movie_id: movieId,
        // THÊM ĐIỀU KIỆN NÀY: Suất chiếu phải bắt đầu trước thời điểm hiện tại
        start_time: { [Op.lt]: new Date() } 
      },
      required: true // Bắt buộc Booking này phải join được với Showtime của Phim này
    }]
  });

  return bookingCount > 0;
};

// 2. Thêm bình luận
exports.createComment = async (userId, movieId, content, rating) => {
  // Kiểm tra quyền trước khi cho phép tạo
  const canComment = await exports.checkCanComment(userId, movieId);
  if (!canComment) {
    throw new Error('NOT_ELIGIBLE');
  }

  const existingComment = await Comment.findOne({ where: { user_id: userId, movie_id: movieId } });
  if (existingComment) {
    throw new Error('ALREADY_COMMENTED'); // Nếu mỗi người chỉ được 1 comment
  }
  const moderationResult = await aiService.moderateComment(content);
  
  if (moderationResult.isToxic) {
    // Nếu AI phát hiện vi phạm, ném lỗi ra kèm theo lý do từ AI
    const error = new Error('TOXIC_COMMENT');
    error.aiReason = moderationResult.reason; // Lưu lại lý do để báo cho user
    throw error;
  }

  // 3. Nếu AI cho qua, lưu bình luận vào Database
  return await Comment.create({ user_id: userId, movie_id: movieId, content, rating })

};

// 3. Lấy danh sách bình luận của 1 phim
exports.getCommentsByMovie = async (movieId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const { count, rows } = await Comment.findAndCountAll({
    where: { movie_id: movieId },
    limit,
    offset,
    order: [['createdAt', 'DESC']], // Mới nhất lên đầu
    include: [{
      model: User,
      as: 'user',
      attributes: ['id', 'fullName', 'avatarUrl'] // Chỉ lấy thông tin cơ bản của người bình luận
    }]
  });

  return {
    comments: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }
  };
};