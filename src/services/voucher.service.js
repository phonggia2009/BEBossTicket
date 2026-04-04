const { Voucher } = require('../models');
const { Op } = require('sequelize');

// [ADMIN] Lấy danh sách Voucher
exports.getAllVouchers = async () => {
  return await Voucher.findAll({ order: [['createdAt', 'DESC']] });
};

// [ADMIN] Tạo Voucher mới
exports.createVoucher = async (data) => {
  const existing = await Voucher.findOne({ where: { code: data.code } });
  if (existing) throw new Error('VOUCHER_CODE_EXISTS');
  return await Voucher.create(data);
};

// [ADMIN] Bật/Tắt Voucher
exports.toggleVoucher = async (id) => {
  const voucher = await Voucher.findByPk(id);
  if (!voucher) throw new Error('VOUCHER_NOT_FOUND');
  await voucher.update({ is_active: !voucher.is_active });
  return voucher;
};

// [USER] Kiểm tra Voucher hợp lệ và tính tiền giảm
exports.checkVoucher = async (code, orderValue) => {
  const voucher = await Voucher.findOne({ where: { code, is_active: true } });
  if (!voucher) throw new Error('VOUCHER_INVALID');
  
  const now = new Date();
  if (now < voucher.start_date || now > voucher.end_date) throw new Error('VOUCHER_EXPIRED');
  if (voucher.used_count >= voucher.usage_limit) throw new Error('VOUCHER_OUT_OF_USAGE');
  if (orderValue < voucher.min_order_value) throw new Error('ORDER_VALUE_NOT_ENOUGH');

  let discountAmount = 0;
  if (voucher.discount_type === 'FIXED') {
    discountAmount = voucher.discount_value;
  } else {
    discountAmount = (orderValue * voucher.discount_value) / 100;
    if (voucher.max_discount && discountAmount > voucher.max_discount) discountAmount = voucher.max_discount;
  }

  if (discountAmount > orderValue) discountAmount = orderValue;
  return { voucher, discountAmount };
};