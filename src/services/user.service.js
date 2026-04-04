const { Op } = require('sequelize');
const User = require('../models/User');

exports.getAllUsers = async (page = 1, limit = 15, role, search) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (role) whereClause.role = role;
  if (search) {
    // Lưu ý: Nếu bạn dùng MySQL, hãy dùng Op.like thay vì Op.iLike (dành cho PostgreSQL)
    whereClause[Op.or] = [
      { fullName: { [Op.like]: `%${search}%` } },
      { email: { [Op.like]: `%${search}%` } },
      { phoneNumber: { [Op.like]: `%${search}%` } },
    ];
  }

  const { count, rows } = await User.findAndCountAll({
    where: whereClause,
    attributes: { exclude: ['password'] },
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return {
    users: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
    },
  };
};

exports.getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] },
  });
  if (!user) throw new Error('USER_NOT_FOUND');
  return user;
};

exports.updateUserRole = async (targetUserId, currentUserId, role) => {
  const VALID_ROLES = ['ADMIN', 'USER'];
  
  if (!role || !VALID_ROLES.includes(role)) throw new Error('INVALID_ROLE');
  if (String(targetUserId) === String(currentUserId)) throw new Error('CANNOT_MODIFY_SELF');

  const user = await User.findByPk(targetUserId);
  if (!user) throw new Error('USER_NOT_FOUND');

  await user.update({ role });
  return user;
};

exports.deleteUser = async (targetUserId, currentUserId) => {
  if (String(targetUserId) === String(currentUserId)) throw new Error('CANNOT_DELETE_SELF');

  const user = await User.findByPk(targetUserId);
  if (!user) throw new Error('USER_NOT_FOUND');

  await user.destroy();
  return true;
};
exports.updateProfile = async (userId, updateData) => {
  const user = await User.findByPk(userId);
  if (!user) throw new Error('USER_NOT_FOUND');

  const { fullName, phoneNumber } = updateData;
  const dataToUpdate = {};
  if (fullName !== undefined) dataToUpdate.fullName = fullName;
  if (phoneNumber !== undefined) dataToUpdate.phoneNumber = phoneNumber;

  // Cập nhật vào Database
  await user.update(dataToUpdate);

  return user;
}