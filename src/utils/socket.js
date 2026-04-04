// utils/socket.js
const socketIo = require('socket.io');

let io;
// Lưu trữ ghế đang được giữ. Cấu trúc: 
// { showtimeId: { seatId: userId, ... }, ... }
const holdingSeats = {}; 

module.exports = {
  init: (httpServer) => {
    io = socketIo(httpServer, {
      cors: {
        origin: "*", // Thay bằng domain frontend của bạn trên production
        methods: ["GET", "POST"]
      }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // 1. Tham gia vào phòng của 1 suất chiếu
      socket.on('joinShowtime', ({ showtimeId }) => {
        socket.join(`showtime_${showtimeId}`);
        // Gửi ngay danh sách các ghế ĐANG BỊ GIỮ cho user vừa join
        socket.emit('currentHoldingSeats', holdingSeats[showtimeId] || {});
      });

      // 2. Rời khỏi phòng
      socket.on('leaveShowtime', ({ showtimeId }) => {
        socket.leave(`showtime_${showtimeId}`);
      });

      // 3. Khi user click chọn 1 ghế (Hold)
      socket.on('holdSeat', ({ showtimeId, seatId, userId }) => {
        if (!holdingSeats[showtimeId]) {
          holdingSeats[showtimeId] = {};
        }

        // Nếu ghế chưa ai giữ, cho phép user này giữ
        if (!holdingSeats[showtimeId][seatId]) {
          holdingSeats[showtimeId][seatId] = userId;
          
          // Phát sự kiện cho TẤT CẢ mọi người trong room biết ghế này đang bị giữ
          io.to(`showtime_${showtimeId}`).emit('seatHeld', { showtimeId, seatId, userId });
        }
      });

      // 4. Khi user bỏ chọn ghế (Release)
      socket.on('releaseSeat', ({ showtimeId, seatId, userId }) => {
        if (holdingSeats[showtimeId] && holdingSeats[showtimeId][seatId] === userId) {
          delete holdingSeats[showtimeId][seatId];
          
          // Phát sự kiện cho mọi người biết ghế đã được nhả
          io.to(`showtime_${showtimeId}`).emit('seatReleased', { showtimeId, seatId, userId });
        }
      });
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    return io;
  },

  getIo: () => {
    if (!io) {
      throw new Error('Socket.io chưa được khởi tạo!');
    }
    return io;
  },

  getHoldingSeats: () => holdingSeats
};