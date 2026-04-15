const express = require('express');
const authRoutes = require('./routes/auth.routes');
const app = express();
const cors = require('cors');
// const { startBookingCron } = require('./cron/bookingCron');
// startBookingCron(); // Gọi hàm để bắt đầu cron job


app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Chào mừng bạn đến với Node.js Backend!');
});

// KHAI BÁO TẤT CẢ CÁC ROUTES Ở ĐÂY
app.use('/api/auth', authRoutes);
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/movies', require('./routes/movie.routes'));
app.use('/api/genres', require('./routes/genre.routes'));
app.use('/api/cinemas', require('./routes/cinema.routes'));
app.use('/api/rooms', require('./routes/room.routes'));
app.use('/api/seats', require('./routes/seat.routes'));
app.use('/api/showtimes', require('./routes/showtime.routes'));
app.use('/api/products', require('./routes/product.routes'));
app.use('/api/bookings', require('./routes/booking.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/dashboard', require('./routes/dashboard.routes'));
app.use('/api/comments', require('./routes/comment.routes'));
app.use('/api/chatbot', require('./routes/chatbot.routes'));
app.use('/api/vouchers', require('./routes/voucher.routes'));

// MIDDLEWARE BẮT LỖI
app.use((err, req, res, next) => {
  console.log("=== PHÁT HIỆN LỖI Ở MIDDLEWARE ===");
  console.error(err); 
  res.status(500).json({
    code: 500,
    status: 'error',
    message: 'Lỗi từ Middleware (Multer/Cloudinary)',
    detail: err.message || err
  });
});

// LUÔN LUÔN ĐỂ MODULE.EXPORTS Ở DÒNG CUỐI CÙNG
module.exports = app;