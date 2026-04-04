const { Cinema, Room } = require('../models');
const { Op } = require('sequelize');

// 1. Tạo rạp mới
exports.createCinema = async (cinemaData) => {
  return await Cinema.create(cinemaData);
};

// 2. Lấy danh sách tất cả các rạp (kèm phòng chiếu)
exports.getAllCinemas = async () => {
  return await Cinema.findAll({
    include: { model: Room, as: 'rooms', attributes: ['id', 'room_name'] }
  });
};

// 3. Lấy thông tin chi tiết một rạp
exports.getCinemaById = async (id) => {
  const cinema = await Cinema.findByPk(id, {
    include: { model: Room, as: 'rooms' }
  });
  
  if (!cinema) {
    throw new Error('CINEMA_NOT_FOUND');
  }
  return cinema;
};

// 4. Cập nhật thông tin rạp
exports.updateCinema = async (id, updateData) => {
  const [updated] = await Cinema.update(updateData, {
    where: { id }
  });

  if (!updated) {
    throw new Error('CINEMA_NOT_FOUND');
  }

  // Trả về dữ liệu rạp sau khi đã cập nhật
  return await Cinema.findByPk(id);
};

// 5. Xóa rạp
exports.deleteCinema = async (id) => {
  const deleted = await Cinema.destroy({
    where: { id }
  });

  if (!deleted) {
    throw new Error('CINEMA_NOT_FOUND');
  }
  return true; // Trả về true nếu xóa thành công
};

// 6. Tìm kiếm rạp theo tên hoặc thành phố
exports.searchCinemas = async (query) => {
  if (!query) return []; // Trả về mảng rỗng nếu không có từ khóa
  
  return await Cinema.findAll({
    where: {
      [Op.or]: [
        { cinema_name: { [Op.like]: `%${query}%` } },
        { city: { [Op.like]: `%${query}%` } }
      ]
    }
  });
};