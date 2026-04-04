const sendResponse = (res, statusCode, message, data = {}) => {
  return res.status(statusCode).json({
    code: statusCode,
    status: statusCode < 400 ? 'success' : 'error',
    message: message,
    data: data // Để dữ liệu vào một cục 'data' cho gọn
  });
};

module.exports = sendResponse;