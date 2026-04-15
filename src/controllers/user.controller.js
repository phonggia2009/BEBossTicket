const userService = require('../services/user.service');
const sendResponse = require('../utils/responseHelper');

exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const { role, search } = req.query;

    const data = await userService.getAllUsers(page, limit, role, search);
    return sendResponse(res, 200, 'Lấy danh sách người dùng thành công', data);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống!', { error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return sendResponse(res, 200, 'Lấy thông tin người dùng thành công', { user });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy người dùng!');
    return sendResponse(res, 500, 'Lỗi hệ thống!', { error: error.message });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const user = await userService.updateUserRole(req.params.id, req.user.id, req.body.role);
    return sendResponse(res, 200, `Đã cập nhật quyền thành ${req.body.role}`, {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.message === 'INVALID_ROLE') return sendResponse(res, 400, 'Role không hợp lệ');
    if (error.message === 'CANNOT_MODIFY_SELF') return sendResponse(res, 403, 'Không thể thay đổi quyền của chính mình');
    if (error.message === 'USER_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy người dùng!');
    
    return sendResponse(res, 500, 'Lỗi hệ thống!', { error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await userService.deleteUser(req.params.id, req.user.id);
    return sendResponse(res, 200, 'Xóa người dùng thành công');
  } catch (error) {
    if (error.message === 'CANNOT_DELETE_SELF') return sendResponse(res, 403, 'Không thể xóa tài khoản của chính mình');
    if (error.message === 'USER_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy người dùng!');
    
    return sendResponse(res, 500, 'Lỗi hệ thống!', { error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    return sendResponse(res, 200, 'Lấy thông tin cá nhân thành công!', { user });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy người dùng!');
    return sendResponse(res, 500, 'Lỗi hệ thống!', { error: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updatedUser = await userService.updateProfile(userId, req.body);

    return sendResponse(res, 200, 'Cập nhật thông tin cá nhân thành công!', { 
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role
      }
    });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy người dùng!');
    return sendResponse(res, 500, 'Lỗi hệ thống!', { error: error.message });
  }
};

exports.getAllPointHistoryAdmin = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const filters = {};
    if (req.query.user_id) filters.user_id = req.query.user_id;

    // 👉 FIX: Đổi pointService thành userService
    const data = await userService.getAllPointHistories(page, limit, filters);
    return sendResponse(res, 200, 'Lấy danh sách lịch sử điểm thành công', data);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống khi lấy lịch sử điểm', { error: error.message });
  }
};

// 👉 FIX: Bổ sung hàm getPointHistoryAdmin bị thiếu
exports.getPointHistoryAdmin = async (req, res) => {
  try {
    const targetUserId = req.params.id; // Lấy ID của khách hàng
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const data = await userService.getPointHistoryByUserId(targetUserId, page, limit);
    return sendResponse(res, 200, 'Lấy lịch sử điểm thành công', data);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống khi lấy lịch sử điểm', { error: error.message });
  }
};

exports.getMyPointHistory = async (req, res) => {
  try {
    const userId = req.user.id; 
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    // 👉 FIX: Đổi pointService thành userService
    const data = await userService.getPointHistoryByUserId(userId, page, limit);
    return sendResponse(res, 200, 'Lấy lịch sử điểm thành công', data);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống khi lấy lịch sử điểm', { error: error.message });
  }
};

exports.adjustPointsAdmin = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { amount, reason } = req.body;

    const updatedUser = await userService.adjustUserPoints(targetUserId, amount, reason);

    return sendResponse(res, 200, 'Điều chỉnh điểm thành công!', {
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        points: updatedUser.points 
      }
    });
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy người dùng!');
    if (error.message === 'INVALID_AMOUNT') return sendResponse(res, 400, 'Số điểm điều chỉnh không hợp lệ!');
    if (error.message === 'MISSING_REASON') return sendResponse(res, 400, 'Vui lòng nhập lý do điều chỉnh điểm!');
    if (error.message === 'INSUFFICIENT_POINTS') return sendResponse(res, 400, 'Người dùng không đủ điểm để trừ (điểm không thể âm)!');
    
    return sendResponse(res, 500, 'Lỗi hệ thống khi điều chỉnh điểm', { error: error.message });
  }
};