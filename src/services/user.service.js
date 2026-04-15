const { Op } = require('sequelize');
const User = require('../models/User');
const PointHistory = require('../models/PointHistory');
const sequelize = User.sequelize;
exports.getAllUsers = async (page = 1, limit = 15, role, search) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (role) whereClause.role = role;
  if (search) {
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

  await user.update(dataToUpdate);
  return user;
}

exports.getAllPointHistories = async (page = 1, limit = 15, filters = {}) => {
  const offset = (page - 1) * limit;
  const whereClause = {};
  // 👉 FIX: Đã xóa chữ 's' bị lỗi ở đây

  if (filters.user_id) {
    whereClause.user_id = filters.user_id;
  }

  const { count, rows } = await PointHistory.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: User,
        as: 'user', 
        attributes: ['id', 'fullName', 'email', 'phoneNumber']
      }
    ]
  });

  return {
    histories: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }
  };
};

exports.adjustUserPoints = async (targetUserId, amount, reason) => {
  if (!amount || isNaN(amount)) throw new Error('INVALID_AMOUNT');
  if (!reason || reason.trim() === '') throw new Error('MISSING_REASON');

  const t = await sequelize.transaction();

  try {
    const user = await User.findByPk(targetUserId, { 
      transaction: t, 
      lock: t.LOCK.UPDATE 
    });
    
    if (!user) {
      await t.rollback();
      throw new Error('USER_NOT_FOUND');
    }

    const currentPoints = user.points || 0;
    const newPoints = currentPoints + Number(amount);

    if (newPoints < 0) {
      await t.rollback();
      throw new Error('INSUFFICIENT_POINTS'); 
    }

    await user.update({ points: newPoints }, { transaction: t });

    await exports.logPointChange(
      user.id,
      Number(amount),
      newPoints,
      `Admin điều chỉnh thủ công: ${reason}`,
      t
    );

    await t.commit();
    return user;

  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    throw error;
  }
};

exports.getPointHistoryByUserId = async (userId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  
  const { count, rows } = await PointHistory.findAndCountAll({
    where: { user_id: userId },
    limit,
    offset,
    order: [['createdAt', 'DESC']]
  });

  return {
    history: rows,
    pagination: {
      totalItems: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    }
  };
};

exports.logPointChange = async (userId, amount, balance, reason, transaction = null) => {
  await PointHistory.create({
    user_id: userId,
    change_amount: amount,
    balance_after: balance,
    reason: reason
  }, { transaction });
};