const dashboardService = require('../services/dashboard.service');
const sendResponse = require('../utils/responseHelper');

exports.getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    return sendResponse(res, 200, 'Lấy dữ liệu thống kê thành công', stats);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống khi lấy thống kê', { error: error.message });
  }
};