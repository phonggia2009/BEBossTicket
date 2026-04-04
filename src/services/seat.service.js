const { Seat, Room } = require('../models');

exports.getSeatsByRoom = async (roomId) => {
  const room = await Room.findByPk(roomId);
  if (!room) {
    throw new Error('ROOM_NOT_FOUND');
  }

  return await Seat.findAll({
    where: { room_id: roomId },
    order: [['seat_row', 'ASC'], ['seat_number', 'ASC']],
  });
};

exports.bulkCreateSeats = async (roomId, seats) => {
  if (!seats || !Array.isArray(seats) || seats.length === 0) {
    throw new Error('INVALID_SEAT_DATA');
  }

  const room = await Room.findByPk(roomId);
  if (!room) {
    throw new Error('ROOM_NOT_FOUND');
  }

  const validTypes = ['NORMAL', 'VIP', 'COUPLE'];
  for (const seat of seats) {
    if (!seat.seat_row || !seat.seat_number || !validTypes.includes(seat.seat_type)) {
      throw new Error(`INVALID_SEAT_ITEM|${JSON.stringify(seat)}`);
    }
  }

  // Xóa toàn bộ ghế cũ của phòng
  await Seat.destroy({ where: { room_id: roomId } });

  // Đảm bảo tất cả ghế đều có đúng room_id
  const seatsToInsert = seats.map(s => ({
    seat_row: s.seat_row,
    seat_number: s.seat_number,
    seat_type: s.seat_type,
    room_id: Number(roomId),
  }));

  const created = await Seat.bulkCreate(seatsToInsert);

  // Cập nhật capacity của phòng theo số ghế thực tế
  await room.update({ capacity: created.length });

  return created.length; // Trả về số lượng ghế đã tạo
};

exports.deleteAllSeats = async (roomId) => {
  const room = await Room.findByPk(roomId);
  if (!room) {
    throw new Error('ROOM_NOT_FOUND');
  }

  const deletedCount = await Seat.destroy({ where: { room_id: roomId } });

  // Reset capacity về 0
  await room.update({ capacity: 0 });

  return deletedCount;
};

exports.updateSeat = async (seatId, seatType) => {
  const validTypes = ['NORMAL', 'VIP', 'COUPLE'];
  if (!validTypes.includes(seatType)) {
    throw new Error('INVALID_SEAT_TYPE');
  }

  const seat = await Seat.findByPk(seatId);
  if (!seat) {
    throw new Error('SEAT_NOT_FOUND');
  }

  await seat.update({ seat_type: seatType });
  return seat;
};