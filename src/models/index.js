// models/index.js

const Cinema = require('./Cinema');
const Room = require('./Room');
const Seat = require('./Seat');
const Movie = require('./Movie');
const Genre = require('./Genre');
const Showtime = require('./Showtime');
const ShowtimePrice = require('./ShowtimePrice'); 
const Booking = require('./Booking');
const Ticket = require('./Ticket');
const BookingItem = require('./BookingItem');
const Product = require('./Product');
const User = require('./User');
const Comment = require('./Comment'); 
const Voucher = require('./Voucher');
const PointHistory = require('./PointHistory'); 
const Setting = require('./Setting');


// --- 1. Quan hệ Phim & Lịch chiếu ---
Movie.hasMany(Showtime, { foreignKey: 'movie_id', as: 'showtimes' });
Showtime.belongsTo(Movie, { foreignKey: 'movie_id', as: 'movie' });

// --- 2. Quan hệ Phòng & Lịch chiếu ---
Room.hasMany(Showtime, { foreignKey: 'room_id', as: 'showtimes' });
Showtime.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

// --- 3. Quan hệ Rạp & Phòng ---
Cinema.hasMany(Room, { foreignKey: 'cinema_id', as: 'rooms' });
Room.belongsTo(Cinema, { foreignKey: 'cinema_id', as: 'cinema' });

// --- 4. Quan hệ Phòng & Ghế ---
Room.hasMany(Seat, { foreignKey: 'room_id', as: 'seats' });
Seat.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });

// --- 5. Quan hệ Nhiều - Nhiều: Phim & Thể loại ---
Movie.belongsToMany(Genre, { 
  through: 'MovieGenres', 
  foreignKey: 'movieId',
  as: 'genres' 
});
Genre.belongsToMany(Movie, { 
  through: 'MovieGenres', 
  foreignKey: 'genreId',
  as: 'movies'
});

// --- 6. Quan hệ Lịch chiếu & Bảng giá vé theo loại ghế ---
Showtime.hasMany(ShowtimePrice, { 
  as: 'seat_prices', 
  foreignKey: 'showtime_id',
  onDelete: 'CASCADE'
});
ShowtimePrice.belongsTo(Showtime, { foreignKey: 'showtime_id' });


// -----------------------------------------
// 1. Quan hệ giữa User và Booking
// -----------------------------------------
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// -----------------------------------------
// 2. Quan hệ giữa Showtime và Booking / Ticket
// -----------------------------------------
Showtime.hasMany(Booking, { foreignKey: 'showtime_id', as: 'bookings' });
Booking.belongsTo(Showtime, { foreignKey: 'showtime_id', as: 'showtime' });

Showtime.hasMany(Ticket, { foreignKey: 'showtime_id', as: 'tickets' });
Ticket.belongsTo(Showtime, { foreignKey: 'showtime_id', as: 'showtime' });

// -----------------------------------------
// 3. Quan hệ nội bộ nhóm Booking (Hóa đơn)
// -----------------------------------------
Booking.hasMany(Ticket, { foreignKey: 'booking_id', as: 'tickets' });
Ticket.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Booking.hasMany(BookingItem, { foreignKey: 'booking_id', as: 'products' });
BookingItem.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// -----------------------------------------
// 4. Quan hệ của Ticket với Seat
// -----------------------------------------
Seat.hasMany(Ticket, { foreignKey: 'seat_id', as: 'tickets' });
Ticket.belongsTo(Seat, { foreignKey: 'seat_id', as: 'seat' });

// -----------------------------------------
// 5. Quan hệ của BookingItem với Product
// -----------------------------------------
Product.hasMany(BookingItem, { foreignKey: 'product_id', as: 'booking_items' });
BookingItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// -----------------------------------------
// 6. Quan hệ User và Comment
// -----------------------------------------
User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// -----------------------------------------
// 7. Quan hệ Movie và Comment
// -----------------------------------------
Movie.hasMany(Comment, { foreignKey: 'movie_id', as: 'comments' });
Comment.belongsTo(Movie, { foreignKey: 'movie_id', as: 'movie' });

// -----------------------------------------
// 8. Quan hệ Voucher và Booking
// -----------------------------------------
Voucher.hasMany(Booking, { foreignKey: 'voucher_id', as: 'bookings' });
Booking.belongsTo(Voucher, { foreignKey: 'voucher_id', as: 'voucher' });

// -----------------------------------------
// 9. Quan hệ User và PointHistory (LỊCH SỬ ĐIỂM)
// -----------------------------------------
// 👉 BƯỚC 2: KHAI BÁO QUAN HỆ Ở ĐÂY
User.hasMany(PointHistory, { foreignKey: 'user_id', as: 'point_histories' });
PointHistory.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// --- EXPORT ---
module.exports = {
  Movie,
  Genre,
  Cinema,
  Room,
  Seat,
  Showtime,
  ShowtimePrice,
  BookingItem,
  Product,
  Booking,
  Ticket,
  User,
  Comment,
  Voucher,
  PointHistory,
  Setting,
};