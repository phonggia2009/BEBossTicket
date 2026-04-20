// src/utils/socket.js
const socketIo = require('socket.io');

let io;
// Lưu trữ ghế đang được giữ. Cấu trúc: { showtimeId: { seatId: userId, ... }, ... }
const holdingSeats = {}; 

// Theo dõi xem mỗi socket đang giữ những ghế nào
// Cấu trúc: { socketId: [{ showtimeId, seatId, userId }, ...] }
const socketTracker = {}; 

module.exports = {
  init: (httpServer) => {
    // 👉 SỬA LỖI TẠI ĐÂY: Đồng bộ CORS với Express
    const allowedOrigins = [
      'http://localhost:5173',
      process.env.FRONTEND_URL 
    ].filter(Boolean); // Lọc bỏ giá trị undefined nếu chưa cài biến môi trường

    io = socketIo(httpServer, {
      cors: { 
        origin: allowedOrigins, // Chỉ cho phép các domain được chỉ định
        methods: ["GET", "POST"],
        credentials: true // Bắt buộc phải có để hoạt động với cookie/token trên web thực tế
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      socketTracker[socket.id] = [];

      socket.on('joinShowtime', ({ showtimeId }) => {
        socket.join(`showtime_${showtimeId}`);
        socket.emit('currentHoldingSeats', holdingSeats[showtimeId] || {});
      });

      socket.on('leaveShowtime', ({ showtimeId }) => {
        socket.leave(`showtime_${showtimeId}`);
      });

      // Lưu ghế bằng socket.id
      socket.on('holdSeat', ({ showtimeId, seatId }) => {
        if (!holdingSeats[showtimeId]) holdingSeats[showtimeId] = {};

        if (!holdingSeats[showtimeId][seatId]) {
          holdingSeats[showtimeId][seatId] = socket.id; // Dùng socket.id làm chủ sở hữu
          socketTracker[socket.id].push({ showtimeId, seatId });
          
          // Phát sự kiện kèm socketId
          io.to(`showtime_${showtimeId}`).emit('seatHeld', { showtimeId, seatId, socketId: socket.id });
        }
      });

      // Chỉ cho nhả ghế nếu đúng là cái Tab (socket.id) đã giữ nó
      socket.on('releaseSeat', ({ showtimeId, seatId }) => {
        if (holdingSeats[showtimeId] && holdingSeats[showtimeId][seatId] === socket.id) {
          delete holdingSeats[showtimeId][seatId];
          
          socketTracker[socket.id] = socketTracker[socket.id].filter(
            (seat) => !(seat.showtimeId === showtimeId && seat.seatId === seatId)
          );
          
          io.to(`showtime_${showtimeId}`).emit('seatReleased', { showtimeId, seatId, socketId: socket.id });
        }
      });

      socket.on('disconnect', () => {
        const seatsToRelease = socketTracker[socket.id];
        if (seatsToRelease && seatsToRelease.length > 0) {
          seatsToRelease.forEach(({ showtimeId, seatId }) => {
            if (holdingSeats[showtimeId] && holdingSeats[showtimeId][seatId] === socket.id) {
              delete holdingSeats[showtimeId][seatId]; 
              io.to(`showtime_${showtimeId}`).emit('seatReleased', { showtimeId, seatId });
            }
          });
        }
        delete socketTracker[socket.id];
      });
    });

    return io;
  },
  getIo: () => { if (!io) throw new Error('Socket.io error'); return io; },
  getHoldingSeats: () => holdingSeats
};