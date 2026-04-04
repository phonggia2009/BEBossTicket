const commentService = require('../services/comment.service');
const sendResponse = require('../utils/responseHelper');

// Client gọi để check xem có nên hiển thị ô nhập Comment hay không
exports.checkEligibility = async (req, res) => {
  try {
    const userId = req.user.id;
    const movieId = req.params.movieId;
    const canComment = await commentService.checkCanComment(userId, movieId);
    
    return sendResponse(res, 200, 'Check quyền bình luận thành công', { canComment });
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

// exports.createComment = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     const { movieId, content, rating } = req.body;

//     if (!movieId || !content) {
//       return sendResponse(res, 400, 'Thiếu thông tin bắt buộc (movieId, content)');
//     }

//     const comment = await commentService.createComment(userId, movieId, content, rating || 5);
//     return sendResponse(res, 201, 'Bình luận thành công', { comment });
//   } catch (error) {
//     if (error.message === 'NOT_ELIGIBLE') {
//       return sendResponse(res, 403, 'Bạn phải mua vé xem phim này mới được bình luận!');
//     }
//     if (error.message === 'ALREADY_COMMENTED') {
//       return sendResponse(res, 400, 'Bạn đã bình luận cho phim này rồi!');
//     }
//     if (error.message === 'TOXIC_COMMENT') {
//       return sendResponse(res, 400, `Bình luận bị từ chối: ${error.aiReason}`);
//     }
//     return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
//   }
// };
exports.createComment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { movieId, content, rating } = req.body;

    if (!movieId || !content) {
      return sendResponse(res, 400, 'Thiếu thông tin bắt buộc (movieId, content)');
    }

    // Gọi service để tạo comment
    const comment = await commentService.createComment(userId, movieId, content, rating || 5);
    return sendResponse(res, 201, 'Bình luận thành công', { comment });
    
  } catch (error) {
    // 👇 THÊM DÒNG NÀY ĐỂ IN LỖI RA TERMINAL
    console.error("=== LỖI TẠO BÌNH LUẬN ===");
    console.error(error);
    console.error("==========================");

    if (error.message === 'NOT_ELIGIBLE') {
      return sendResponse(res, 403, 'Bạn phải mua vé xem phim này mới được bình luận!');
    }
    if (error.message === 'ALREADY_COMMENTED') {
      return sendResponse(res, 400, 'Bạn đã bình luận cho phim này rồi!');
    }
    if (error.message === 'TOXIC_COMMENT') {
      return sendResponse(res, 400, `Bình luận bị từ chối: ${error.aiReason}`);
    }
    
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.getMovieComments = async (req, res) => {
  try {
    const movieId = req.params.movieId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const data = await commentService.getCommentsByMovie(movieId, page, limit);
    return sendResponse(res, 200, 'Lấy danh sách bình luận thành công', data);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};