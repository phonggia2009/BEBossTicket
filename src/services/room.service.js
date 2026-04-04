const { Room, Cinema } = require('../models');

exports.createRoom = async (roomData) => {
  const { cinema_id, room_name, capacity } = roomData;
  
  // Kiểm tra rạp có tồn tại không
  const cinema = await Cinema.findByPk(cinema_id);
  if (!cinema) {
    throw new Error('CINEMA_NOT_FOUND');
  }

  return await Room.create({ cinema_id, room_name, capacity });
};

exports.getAllRooms = async () => {
  return await Room.findAll({
    include: { model: Cinema, as: 'cinema', attributes: ['cinema_name'] }
  });
};

exports.getRoomsByCinema = async (cinemaId) => {
  return await Room.findAll({
    where: { cinema_id: cinemaId }
  });
};

exports.updateRoom = async (id, updateData) => {
  const { room_name, capacity } = updateData;
  
  const [updated] = await Room.update(
    { room_name, capacity },
    { where: { id } }
  );

  if (!updated) {
    throw new Error('ROOM_NOT_FOUND');
  }
  
  return await Room.findByPk(id);
};

exports.deleteRoom = async (id) => {
  const deleted = await Room.destroy({ where: { id } });
  
  if (!deleted) {
    throw new Error('ROOM_NOT_FOUND');
  }
  
  return true;
};