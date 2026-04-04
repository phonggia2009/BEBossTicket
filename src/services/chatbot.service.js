const cacheService = require('./cache.service');
const aiService = require('./ai.service');
const { Movie, Showtime, Cinema, Room } = require('../models');
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
 *
 * Bậc 1 — substring match (chính xác nhất):
 *   - title chứa toàn bộ query                  → 0.95
 *   - query chứa toàn bộ title (user gõ dài hơn) → 0.85
 *
 * Bậc 2 — word overlap (cho query nhiều từ):
 *   Tỉ lệ từ của query xuất hiện trong title.
 *   Chỉ tính nếu từ >= 2 ký tự để tránh nhiễu.
 *   Score = (từ khớp / tổng từ query) * 0.8
 *   → Điểm tối đa bậc 2 là 0.8, không bao giờ vượt bậc 1.
 *
 * Không dùng character-level fallback vì quá lỏng
 * (mọi tên phim đều chia sẻ các ký tự thông thường như a, e, i, o).
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
 * Trả về [] nếu không có ứng viên đủ điểm.
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
  if (!showtimes.length) return `Phim "${movie.title}" hiện chưa có suất chiếu.`;
  const lines = showtimes.map(
    (st) => `  🕐 ${formatDatetime(st.start_time)} — 🏛 ${st.room?.cinema?.cinema_name ?? 'N/A'}`
  );
  return `🎬 Suất chiếu "${movie.title}":\n${lines.join('\n')}`;
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
  if (index < 0 || index >= choices.length) return '⚠️ Lựa chọn không hợp lệ, hãy nhập số đúng trong danh sách.';

  const movie = choices[index];
  const showtimes = await getUpcomingShowtimes(movie.id);
  return formatShowtimes(movie, showtimes);
};

/**
 * Xử lý: phim đang chiếu / phim hôm nay.
 */
const handleNowPlaying = async () => {
  const movies = await Movie.findAll({
    limit: 8,
    attributes: ['title'],
    order: [['createdAt', 'DESC']],
  });
  if (!movies.length) return 'Hiện chưa có phim nào đang chiếu.';
  const list = movies.map((m, i) => `  ${i + 1}. ${m.title}`).join('\n');
  return `🎥 Phim đang chiếu:\n${list}`;
};

/**
 * Xử lý: truy vấn suất chiếu theo tên phim.
 */
// Các từ cần loại bỏ khi trích tên phim ra khỏi câu lệnh
const STRIP_WORDS =
  /\b(hay|tim|kiem|cho|biet|muon|giup|ban|toi|la|co|khong|va|de|xem|phim|suat chieu|gio chieu|lich chieu|dat ve|mua ve|xem phim)\b/g;

const handleShowtimeQuery = async (msg, userId) => {
  const DBG = (...args) => console.log('[CHATBOT_DEBUG][showtime]', ...args);

  const normalized = normalize(msg);
  DBG('raw msg normalized :', JSON.stringify(normalized));

  const stripped = normalized
    .replace(STRIP_WORDS, '')
    .replace(/\s+/g, ' ')
    .trim();

  DBG('after STRIP_WORDS  :', JSON.stringify(stripped));

  if (!stripped) return 'Bạn muốn xem suất chiếu của phim nào? Hãy cho tôi biết tên phim nhé 🎬';

  const allMovies = await Movie.findAll({ attributes: ['id', 'title'] });
  DBG('total movies in DB :', allMovies.length);

  const scored = allMovies.map((m) => ({ title: m.title, score: similarityScore(stripped, m.title) }));
  DBG('similarity scores  :', JSON.stringify(scored.sort((a, b) => b.score - a.score).slice(0, 5)));

  const matched = findMatchingMovies(allMovies, stripped);
  DBG('matched movies     :', matched.map((m) => m.title));

  if (matched.length === 0) return `😕 Không tìm thấy phim nào khớp với "${stripped}". Bạn thử tên khác không?`;

  if (matched.length === 1) {
    const showtimes = await getUpcomingShowtimes(matched[0].id);
    DBG('showtimes found    :', showtimes.length);
    return formatShowtimes(matched[0], showtimes);
  }

  await cacheService.set(`movie_choices_${userId}`, matched.slice(0, 6), 300);
  const list = matched.slice(0, 6).map((m, i) => `  ${i + 1}. ${m.title}`).join('\n');
  return `🔍 Tìm thấy nhiều phim:\n${list}\n\n👉 Nhập số để chọn phim bạn muốn xem.`;
};

/**
 * Xử lý: hướng dẫn đặt vé.
 */
const handleBookingGuide = () =>
  `🎟 Cách đặt vé:\n` +
  `  1. Vào Trang Chủ → chọn phim\n` +
  `  2. Chọn suất chiếu và rạp\n` +
  `  3. Chọn ghế ngồi\n` +
  `  4. Thanh toán (thẻ / ví điện tử / tiền mặt tại quầy)\n` +
  `  5. Nhận vé qua email hoặc app 🎉`;

/**
 * Xử lý: thông tin rạp chiếu.
 */
const handleCinemaInfo = async () => {
  const cinemas = await Cinema.findAll({ attributes: ['cinema_name'], limit: 10 });
  if (!cinemas.length) return 'Chưa có thông tin rạp chiếu.';
  const list = cinemas.map((c, i) => `  ${i + 1}. ${c.cinema_name}`).join('\n');
  return `🏛 Danh sách rạp chiếu:\n${list}`;
};

/**
 * Xử lý: xin chào / lời mở đầu.
 */
const handleGreeting = () =>
  `👋 Xin chào! Tôi là trợ lý đặt vé của bạn.\n` +
  `Tôi có thể giúp bạn:\n` +
  `  • Xem phim đang chiếu\n` +
  `  • Tra suất chiếu theo tên phim\n` +
  `  • Hướng dẫn đặt vé\n` +
  `  • Xem danh sách rạp\n\n` +
  `Bạn cần hỗ trợ gì không? 😊`;

// ─────────────────────────────────────────────
// INTENT DETECTION
// ─────────────────────────────────────────────

/**
 * Kiểm tra keyword match với word-boundary cho từ ngắn (< 4 ký tự).
 * Tránh "hi" match nhầm vào "chieu", "alo" match nhầm vào các từ khác.
 */
const keywordMatch = (normalizedMsg, keywords) =>
  keywords.some((kw) =>
    kw.length < 4
      ? new RegExp(`\\b${kw}\\b`).test(normalizedMsg)
      : normalizedMsg.includes(kw)
  );

const INTENTS = [
  // ⚠️ Specific intents TRƯỚC — greeting CUỐI CÙNG
  {
    name: 'showtime',
    keywords: ['suat chieu', 'gio chieu', 'lich chieu', 'chieu luc may gio', 'chieu khi nao', 'tim suat', 'tim phim'],
    handler: (msg, userId) => handleShowtimeQuery(msg, userId),
  },
  {
    name: 'now_playing',
    keywords: ['phim hom nay', 'phim dang chieu', 'phim gi dang chieu', 'co phim gi'],
    handler: () => handleNowPlaying(),
  },
  {
    name: 'booking',
    keywords: ['dat ve', 'mua ve', 'cach dat', 'huong dan dat', 'thanh toan'],
    handler: () => handleBookingGuide(),
  },
  {
    name: 'cinema',
    keywords: ['rap chieu', 'danh sach rap', 'rap o dau', 'tim rap'],
    handler: () => handleCinemaInfo(),
  },
  {
    // Greeting xep CUOI -- chi match khi khong co intent nao o tren khop
    name: 'greeting',
    keywords: ['xin chao', 'chao ban', 'hello', 'hi', 'hey', 'alo'],
    handler: () => handleGreeting(),
  },
];

// INTENTS được dùng trực tiếp trong processChat bên dưới

// ─────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────

exports.processChat = async (message, history, userId) => {
  const DBG = (...args) => console.log('[CHATBOT_DEBUG]', ...args);

  try {
    const trimmed = message.trim();
    const normalizedMsg = normalize(trimmed);

    DBG('─────────────────────────────────────');
    DBG('INPUT raw     :', JSON.stringify(message));
    DBG('INPUT trimmed :', JSON.stringify(trimmed));
    DBG('INPUT normalized:', JSON.stringify(normalizedMsg));
    DBG('userId        :', userId);

    // 1. Nếu user nhập số → kiểm tra context chọn phim
    if (/^\d+$/.test(normalizedMsg)) {
      DBG('STEP 1: detected number input →', normalizedMsg);
      const selectionReply = await handleNumberSelection(normalizedMsg, userId);
      DBG('STEP 1: handleNumberSelection result →', selectionReply ? 'HIT' : 'MISS (no cache context)');
      if (selectionReply) return selectionReply;
    }

    // 2. Kiểm tra cache
    const cacheKey = `chat_${userId}_${normalizedMsg}`;
    DBG('STEP 2: checking cache key →', cacheKey);
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      DBG('STEP 2: CACHE HIT → returning cached response');
      return cached;
    }
    DBG('STEP 2: cache miss → continuing');

    // 3. Intent detection — log từng intent được kiểm tra
    DBG('STEP 3: scanning intents...');
    let matchedIntent = null;
    for (const intent of INTENTS) {
      const hitKeyword = intent.keywords.find((kw) =>
        kw.length < 4 ? new RegExp(`\\b${kw}\\b`).test(normalizedMsg) : normalizedMsg.includes(kw)
      );
      if (hitKeyword) {
        DBG(`STEP 3: ✅ MATCHED intent="${intent.name}" via keyword="${hitKeyword}"`);
        matchedIntent = intent;
        break;
      } else {
        DBG(`STEP 3: ❌ no match for intent="${intent.name}" (keywords: ${intent.keywords.join(', ')})`);
      }
    }

    let response;

    if (matchedIntent) {
      DBG('STEP 4: calling handler for intent →', matchedIntent.name);
      response = await matchedIntent.handler(trimmed, userId);
      DBG('STEP 4: handler response (first 120 chars) →', String(response).slice(0, 120));
    } else {
      DBG('STEP 4: no intent matched → falling back to AI');
      const movies = await Movie.findAll({ limit: 10, attributes: ['title'] });
      const context = movies.map((m) => m.title).join(', ');
      DBG('STEP 4: AI context movies →', context);
      response = await aiService.generateFallbackResponse(trimmed, history, context);
      DBG('STEP 4: AI response (first 120 chars) →', String(response).slice(0, 120));
    }

    // 5. Cache có chọn lọc
    const CACHEABLE_INTENTS = ['now_playing', 'showtime', 'cinema', 'booking'];
    if (matchedIntent && CACHEABLE_INTENTS.includes(matchedIntent.name)) {
      DBG('STEP 5: caching response for intent →', matchedIntent.name);
      await cacheService.set(cacheKey, response, 300);
    } else {
      DBG('STEP 5: skipping cache (intent not cacheable or fallback AI)');
    }

    DBG('FINAL RESPONSE (first 120 chars) →', String(response).slice(0, 120));
    DBG('─────────────────────────────────────');
    return response;
  } catch (err) {
    console.error('[ChatbotService] Error:', err);
    return '⚠️ Hệ thống đang gặp sự cố, vui lòng thử lại sau.';
  }
};