const voucherService = require('../services/voucher.service');
const sendResponse = require('../utils/responseHelper');

exports.getAll = async (req, res) => {
  try {
    const vouchers = await voucherService.getAllVouchers();
    return sendResponse(res, 200, 'Thành công', vouchers);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const voucher = await voucherService.createVoucher(req.body);
    return sendResponse(res, 201, 'Tạo mã thành công', voucher);
  } catch (error) {
    if (error.message === 'VOUCHER_CODE_EXISTS') return sendResponse(res, 400, 'Mã này đã tồn tại');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.check = async (req, res) => {
  try {
    const { code, original_price } = req.body;
    const result = await voucherService.checkVoucher(code, original_price);
    return sendResponse(res, 200, 'Áp dụng mã thành công', result);
  } catch (error) {
    return sendResponse(res, 400, error.message);
  }
};

exports.toggle = async (req, res) => {
  try {
    const voucher = await voucherService.toggleVoucher(req.params.id);
    return sendResponse(res, 200, 'Cập nhật trạng thái thành công', { voucher });
  } catch (error) {
    if (error.message === 'VOUCHER_NOT_FOUND') {
      return sendResponse(res, 404, 'Không tìm thấy mã giảm giá');
    }
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};