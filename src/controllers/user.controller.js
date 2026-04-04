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
    if (error.message === 'INVALID_ROLE') return sendResponse(res, 400, 'Role không hợp lệ. Chỉ chấp nhận: ADMIN, USER');
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
    const userId = req.user.id; // Lấy ID từ token đăng nhập
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