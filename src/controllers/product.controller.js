const productService = require('../services/product.service');
const sendResponse = require('../utils/responseHelper');

exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const { type, search, isAvailable } = req.query;

    const data = await productService.getProducts(page, limit, type, search, isAvailable);
    return sendResponse(res, 200, 'Lấy danh sách sản phẩm thành công', data);
  } catch (error) {
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    return sendResponse(res, 200, 'Lấy chi tiết sản phẩm thành công', { product });
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy sản phẩm');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body, req.files);
    return sendResponse(res, 201, 'Tạo sản phẩm thành công', { product });
  } catch (error) {
    if (error.message === 'MISSING_FIELDS') return sendResponse(res, 400, 'Thiếu thông tin bắt buộc: product_name, price, type');
    if (error.message === 'INVALID_TYPE') return sendResponse(res, 400, 'Type không hợp lệ. Chỉ chấp nhận: FOOD, DRINK, COMBO');
    if (error.message === 'INVALID_PRICE') return sendResponse(res, 400, 'Giá không hợp lệ');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body, req.files);
    return sendResponse(res, 200, 'Cập nhật sản phẩm thành công', { product });
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy sản phẩm');
    if (error.message === 'INVALID_TYPE') return sendResponse(res, 400, 'Type không hợp lệ. Chỉ chấp nhận: FOOD, DRINK, COMBO');
    if (error.message === 'INVALID_PRICE') return sendResponse(res, 400, 'Giá không hợp lệ');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    return sendResponse(res, 200, 'Xóa sản phẩm thành công');
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy sản phẩm');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const product = await productService.updateStock(req.params.id, req.body.quantity);
    return sendResponse(res, 200, 'Cập nhật tồn kho thành công', {
      product: { id: product.id, product_name: product.product_name, quantity: product.quantity }
    });
  } catch (error) {
    if (error.message === 'INVALID_QUANTITY') return sendResponse(res, 400, 'Số lượng không hợp lệ');
    if (error.message === 'PRODUCT_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy sản phẩm');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};

exports.toggleAvailability = async (req, res) => {
  try {
    const product = await productService.toggleAvailability(req.params.id);
    return sendResponse(res, 200, `Sản phẩm đã ${product.isAvailable ? 'hiện' : 'ẩn'}`, { isAvailable: product.isAvailable });
  } catch (error) {
    if (error.message === 'PRODUCT_NOT_FOUND') return sendResponse(res, 404, 'Không tìm thấy sản phẩm');
    return sendResponse(res, 500, 'Lỗi hệ thống', { error: error.message });
  }
};