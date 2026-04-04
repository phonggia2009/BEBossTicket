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
// Đây là quan hệ quan trọng để lấy được seat_prices khi gọi API showtimes
Showtime.hasMany(ShowtimePrice, { 
  as: 'seat_prices', 
  foreignKey: 'showtime_id',
  onDelete: 'CASCADE' // Khi xóa suất chiếu, tự động xóa các giá vé liên quan
});
ShowtimePrice.belongsTo(Showtime, { foreignKey: 'showtime_id' });



// -----------------------------------------
// 1. Quan hệ giữa User và Booking
// Một User có thể có nhiều Hóa đơn
// -----------------------------------------
User.hasMany(Booking, { foreignKey: 'user_id', as: 'bookings' });
Booking.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// -----------------------------------------
// 2. Quan hệ giữa Showtime và Booking / Ticket
// Một Lịch chiếu có thể có nhiều Hóa đơn và nhiều Vé
// -----------------------------------------
Showtime.hasMany(Booking, { foreignKey: 'showtime_id', as: 'bookings' });
Booking.belongsTo(Showtime, { foreignKey: 'showtime_id', as: 'showtime' });

Showtime.hasMany(Ticket, { foreignKey: 'showtime_id', as: 'tickets' });
Ticket.belongsTo(Showtime, { foreignKey: 'showtime_id', as: 'showtime' });

// -----------------------------------------
// 3. Quan hệ nội bộ nhóm Booking (Hóa đơn)
// Một Hóa đơn có nhiều Vé (Tickets) và nhiều Đồ ăn (BookingItems)
// -----------------------------------------
Booking.hasMany(Ticket, { foreignKey: 'booking_id', as: 'tickets' });
Ticket.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

Booking.hasMany(BookingItem, { foreignKey: 'booking_id', as: 'products' });
BookingItem.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });

// -----------------------------------------
// 4. Quan hệ của Ticket với Seat
// Một Vé chỉ thuộc về 1 Ghế cụ thể
// -----------------------------------------
Seat.hasMany(Ticket, { foreignKey: 'seat_id', as: 'tickets' });
Ticket.belongsTo(Seat, { foreignKey: 'seat_id', as: 'seat' });

// -----------------------------------------
// 5. Quan hệ của BookingItem với Product
// Một BookingItem trỏ đến 1 Product (Đồ ăn/nước uống)
// -----------------------------------------
Product.hasMany(BookingItem, { foreignKey: 'product_id', as: 'booking_items' });
BookingItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// 1 User có nhiều Comment
User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 1 Phim có nhiều Comment
Movie.hasMany(Comment, { foreignKey: 'movie_id', as: 'comments' });
Comment.belongsTo(Movie, { foreignKey: 'movie_id', as: 'movie' });

Voucher.hasMany(Booking, { foreignKey: 'voucher_id', as: 'bookings' });
Booking.belongsTo(Voucher, { foreignKey: 'voucher_id', as: 'voucher' });

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
  Voucher 
};