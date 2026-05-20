const cacheService = require('./cache.service');
const aiService = require('./ai.service');
const { Movie, Showtime, Cinema, Room, Voucher } = require('../models');
const { Op } = require('sequelize');

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────

/**
 * Chuẩn hoá chuỗi tiếng Việt → lowercase ASCII không dấu.
 * Lưu ý: thay 'đ' TRƯỚC khi gọi NFD để tránh bị normalize mất.
 */
const normalize = (str) =>
  str
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim();

/**
 * Format đối tượng Date → "HH:MM DD/MM/YYYY"
 */
const formatDatetime = (date) => {
  const d = new Date(date);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${hh}:${mm} ${dd}/${mo}`;
};

/**
 * Tính điểm tương đồng giữa query và tên phim (0–1).
 */
const similarityScore = (query, title) => {
  const q = normalize(query);
  const t = normalize(title);

  // Bậc 1: substring
  if (t === q) return 1;
  if (t.includes(q)) return 0.95;
  if (q.includes(t)) return 0.85;

  // Bậc 2: word overlap
  const qWords = q.split(/\s+/).filter((w) => w.length >= 2);
  if (qWords.length === 0) return 0;
  const matchedWords = qWords.filter((w) => t.includes(w));
  return (matchedWords.length / qWords.length) * 0.8;
};

/**
 * Tìm phim phù hợp nhất với query từ danh sách movies.
 */
const findMatchingMovies = (movies, query, threshold = 0.5) => {
  return movies
    .map((m) => ({ movie: m, score: similarityScore(query, m.title) }))
    .filter(({ score }) => score >= threshold)
    .sort((a, b) => b.score - a.score)
    .map(({ movie }) => movie);
};

// ─────────────────────────────────────────────
// DATABASE HELPERS
// ─────────────────────────────────────────────

/**
 * Lấy danh sách suất chiếu tương lai của một movie_id.
 */
const getUpcomingShowtimes = async (movieId, limit = 5) => {
  return Showtime.findAll({
    where: {
      movie_id: movieId,
      start_time: { [Op.gt]: new Date() },
    },
    include: [
      {
        model: Room,
        as: 'room',
        include: [
          {
            model: Cinema,
            as: 'cinema',
            attributes: ['cinema_name'],
          },
        ],
      },
    ],
    order: [['start_time', 'ASC']],
    limit,
  });
};

/**
 * Format danh sách showtimes thành chuỗi hiển thị.
 */
const formatShowtimes = (movie, showtimes) => {
  if (!showtimes.length) return `Phim "${movie.title}" hiện chưa có suất chiếu trong thời gian tới.`;

  const feUrl = process.env.FRONTEND_URL;

  const lines = showtimes.map((st) => {
    const time = formatDatetime(st.start_time);
    const cinema = st.room?.cinema?.cinema_name ?? 'N/A';
    return ` 🕐 ${time} — 🏛 ${cinema}\n 🔗 Đặt ngay: ${feUrl}/booking/${st.id}`;
  });

  return `🎬 Lịch chiếu phim "${movie.title}":\n${lines.join('\n\n')}`;
};

// ─────────────────────────────────────────────
// INTENT HANDLERS
// ─────────────────────────────────────────────

/**
 * Xử lý: user đang chọn số từ danh sách phim nhiều kết quả.
 */
const handleNumberSelection = async (msg, userId) => {
  const choices = await cacheService.get(`movie_choices_${userId}`);
  if (!choices?.length) return null; // không có context → bỏ qua

  const index = parseInt(msg, 10) - 1;
  if (index < 0 || index >= choices.length) return '⚠️ Lựa chọn không hợp lệ, hãy nhập số đúng trong danh sách nhé.';

  const movie = choices[index];
  const showtimes = await getUpcomingShowtimes(movie.id);
  return formatShowtimes(movie, showtimes);
};

/**
 * Xử lý: Thông tin Voucher / Mã giảm giá
 */
const handleVoucherInfo = async () => {
  const activeVouchers = await Voucher.findAll({
    where: { 
      is_active: true,
      end_date: { [Op.gt]: new Date() } // Chỉ lấy các mã chưa hết hạn
    },
    limit: 5,
    order: [['end_date', 'ASC']]
  });

  if (!activeVouchers.length) return 'Hiện tại BossTicket chưa có mã giảm giá hoặc khuyến mãi nào đang diễn ra. Bạn quay lại sau nhé!';
  
  const list = activeVouchers.map((v, i) => {
    const discountStr = v.discount_type === 'PERCENTAGE' 
      ? `${v.discount_value}%` 
      : `${v.discount_value.toLocaleString('vi-VN')}đ`;
    const titleStr = v.title ? ` - ${v.title}` : '';
    return `  ${i + 1}. 🎟️ Mã [${v.code}]: Giảm ${discountStr}${titleStr} (HSD: ${formatDatetime(v.end_date)})`;
  }).join('\n');
  
  return `🎁 Danh sách mã giảm giá đang áp dụng:\n${list}`;
};

/**
 * 1. Phim đang chiếu
 */
const handleNowPlaying = async () => {
  const movies = await Movie.findAll({
    where: {
      releaseDate: { [Op.lte]: new Date() }
    },
    limit: 8,
    attributes: ['title'],
    order: [['releaseDate', 'DESC']], 
  });

  if (!movies.length) return 'Hiện rạp chưa có phim nào đang chiếu.';
  const list = movies.map((m, i) => `  ${i + 1}. ${m.title}`).join('\n');
  return `🎥 Phim đang chiếu:\n${list}`;
};

/**
 * 2. Phim sắp chiếu
 */
const handleUpcomingMovies = async () => {
  const movies = await Movie.findAll({
    where: {
      releaseDate: { [Op.gt]: new Date() }
    },
    limit: 8,
    attributes: ['title'],
    order: [['releaseDate', 'ASC']], 
  });

  if (!movies.length) return 'Hiện chưa có thông tin phim sắp ra mắt.';
  const list = movies.map((m, i) => `  ${i + 1}. ${m.title}`).join('\n');
  return `🍿 Phim sắp chiếu trong thời gian tới:\n${list}`;
};

/**
 * Xử lý: truy vấn suất chiếu theo tên phim.
 */
// ĐÃ TỐI ƯU: Thêm các từ chỉ thời gian, đại từ để bóc tách tên phim cực chuẩn
const STRIP_WORDS =
  /\b(hay|tim|kiem|cho|biet|muon|giup|ban|toi|la|co|khong|va|de|xem|phim|suat chieu|gio chieu|lich chieu|dat ve|mua ve|xem phim|cac|nhung|ngay|hom|nay|hom nay|ngay mai|hom qua|cua|rap)\b/g;

const handleShowtimeQuery = async (msg, userId) => {
  const DBG = (...args) => console.log('[CHATBOT_DEBUG][showtime]', ...args);

  const normalized = normalize(msg);
  const stripped = normalized
    .replace(STRIP_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim();

  DBG('after STRIP_WORDS:', JSON.stringify(stripped));

  // ĐÃ TỐI ƯU: Nếu không có tên phim, tự động gợi ý danh sách phim đang chiếu
  if (!stripped) {
    const nowPlayingList = await handleNowPlaying();
    return `Bạn muốn xem lịch chiếu của phim nào ạ? Hãy nhập tên phim nhé 🎬\n\n💡 Hoặc bạn có thể tham khảo:\n${nowPlayingList.replace('🎥 Phim đang chiếu:\n', '')}`;
  }

  const allMovies = await Movie.findAll({ attributes: ['id', 'title'] });
  const matched = findMatchingMovies(allMovies, stripped);

  if (matched.length === 0) return `😕 Dạ, không tìm thấy phim nào khớp với từ khóa "${stripped}". Bạn kiểm tra lại tên phim giúp mình nhé!`;

  if (matched.length === 1) {
    const showtimes = await getUpcomingShowtimes(matched[0].id);
    return formatShowtimes(matched[0], showtimes);
  }

  // Nếu có nhiều kết quả khớp, lưu vào cache để người dùng chọn số
  await cacheService.set(`movie_choices_${userId}`, matched.slice(0, 6), 300);
  const list = matched.slice(0, 6).map((m, i) => `  ${i + 1}. ${m.title}`).join('\n');
  return `🔍 Mình tìm thấy nhiều phim khớp với yêu cầu:\n${list}\n\n👉 Vui lòng nhập số (1-${matched.slice(0,6).length}) để chọn phim bạn muốn xem.`;
};

/**
 * Xử lý: hướng dẫn đặt vé.
 */
const handleBookingGuide = () =>
  `🎟 Cách đặt vé tại BossTicket:\n` +
  `  1. Vào Trang Chủ → Chọn phim bạn muốn xem\n` +
  `  2. Bấm "Đặt vé" → Chọn suất chiếu và rạp\n` +
  `  3. Chọn ghế ngồi ưng ý\n` +
  `  4. Thanh toán an toàn qua cổng VNPAY\n` +
  `  5. Nhận mã vé QR qua Email hoặc xem tại Lịch Sử Đặt Vé 🎉`;

/**
 * Xử lý: thông tin rạp chiếu.
 */
const handleCinemaInfo = async () => {
  const cinemas = await Cinema.findAll({ attributes: ['cinema_name'], limit: 10 });
  if (!cinemas.length) return 'Hệ thống chưa cập nhật thông tin rạp chiếu.';
  const list = cinemas.map((c, i) => `  ${i + 1}. ${c.cinema_name}`).join('\n');
  return `🏛 Danh sách cụm rạp BossTicket:\n${list}`;
};

/**
 * Xử lý: xin chào / lời mở đầu.
 */
const handleGreeting = () =>
  `👋 Xin chào! Tôi là trợ lý AI ảo của rạp BossTicket.\n` +
  `Tôi có thể giúp bạn:\n` +
  `  • Xem phim đang chiếu\n` +
  `  • Tra lịch chiếu theo tên phim\n` +
  `  • Hướng dẫn đặt vé\n` +
  `  • Tìm mã giảm giá / khuyến mãi\n\n` +
  `Bạn cần mình hỗ trợ gì ạ? 😊`;

// ─────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────

const INTENTS = [
  {
    name: 'showtime',
    keywords: ['suat chieu', 'gio chieu', 'lich chieu', 'chieu luc may gio', 'chieu khi nao', 'tim suat', 'tim phim', 'xem phim'],
    handler: (msg, userId) => handleShowtimeQuery(msg, userId),
  },
  {
    name: 'now_playing',
    keywords: ['phim hom nay', 'phim dang chieu', 'phim gi dang chieu', 'co phim gi', 'phim gi hot'],
    handler: () => handleNowPlaying(),
  },
  {
    name: 'upcoming',
    keywords: ['phim sap chieu', 'phim moi', 'sap ra mat'],
    handler: () => handleUpcomingMovies(),
  },
  {
    name: 'booking',
    keywords: ['dat ve', 'mua ve', 'cach dat', 'huong dan dat', 'thanh toan'],
    handler: () => handleBookingGuide(),
  },
  {
    name: 'voucher',
    keywords: ['ma giam gia', 'khuyen mai', 'voucher', 'uu dai', 'coupon'],
    handler: () => handleVoucherInfo(),
  },
  {
    name: 'cinema',
    keywords: ['rap chieu', 'danh sach rap', 'rap o dau', 'tim rap', 'cac rap', 'he thong rap'],
    handler: () => handleCinemaInfo(),
  },
  {
    name: 'greeting',
    keywords: ['xin chao', 'chao ban', 'hello', 'hi', 'hey', 'alo'],
    handler: () => handleGreeting(),
  },
];

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

exports.processChat = async (message, history, userId) => {
  const DBG = (...args) => console.log('[CHATBOT_DEBUG]', ...args);

  try {
    const trimmed = message.trim();
    const normalizedMsg = normalize(trimmed);

    // 1. Kiểm tra Context chọn phim (nếu nhập số)
    if (/^\d+$/.test(normalizedMsg)) {
      const selectionReply = await handleNumberSelection(normalizedMsg, userId);
      if (selectionReply) return selectionReply;
    }

    // 2. Kiểm tra Cache
    const cacheKey = `chat_${userId}_${normalizedMsg}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    // 3. Quét Intent
    let matchedIntent = null;
    for (const intent of INTENTS) {
      const hitKeyword = intent.keywords.find((kw) =>
        kw.length < 4 ? new RegExp(`\\b${kw}\\b`).test(normalizedMsg) : normalizedMsg.includes(kw)
      );
      if (hitKeyword) {
        matchedIntent = intent;
        break;
      }
    }

    let response;

    // 4. Gọi Handler hoặc kích hoạt AI Fallback
    if (matchedIntent) {
      response = await matchedIntent.handler(trimmed, userId);
    } else {
      DBG('No intent matched → falling back to AI');
      // ĐÃ TỐI ƯU: Chỉ lấy phim ĐANG CHIẾU để làm Context cho AI (tối đa 10 phim)
      const movies = await Movie.findAll({ 
        where: { releaseDate: { [Op.lte]: new Date() } },
        limit: 10, 
        attributes: ['title'],
        order: [['releaseDate', 'DESC']]
      });
      const context = movies.map((m) => m.title).join(', ');
      
      response = await aiService.generateFallbackResponse(trimmed, history, context);
    }

    // 5. Cache kết quả có chọn lọc (5 phút)
    const CACHEABLE_INTENTS = ['now_playing', 'showtime', 'cinema', 'booking', 'voucher', 'upcoming'];
    if (matchedIntent && CACHEABLE_INTENTS.includes(matchedIntent.name)) {
      await cacheService.set(cacheKey, response, 300);
    }

    return response;
  } catch (err) {
    console.error('[ChatbotService] Error:', err);
    return '⚠️ Hệ thống đang bảo trì hoặc gặp sự cố, vui lòng thử lại sau giây lát ạ.';
  }
};