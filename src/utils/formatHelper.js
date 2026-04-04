// Định dạng tiền tệ: 100000 -> 100.000 VNĐ
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

// Định dạng ngày giờ: 2026-03-16 -> 16/03/2026
exports.formatDate = (date) => {
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN');
};