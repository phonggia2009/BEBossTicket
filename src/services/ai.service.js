const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.moderateComment = async (content) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const prompt = `
      Bạn là hệ thống kiểm duyệt nội dung tự động cho rạp chiếu phim BossTicket.
      Phân tích bình luận sau xem có chứa ngôn từ tục tĩu, xúc phạm, thù ghét, vi phạm pháp luật hoặc tiết lộ nội dung quan trọng của phim (spoil) hay không.
      Tuyệt đối CHỈ trả về định dạng JSON sau:
      {"isToxic": boolean, "reason": "Lý do ngắn gọn bằng tiếng Việt nếu isToxic là true, nếu false thì để trống"}
      
      Bình luận cần kiểm tra: "${content}"
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Nhờ responseMimeType, text trả về chắc chắn là JSON hợp lệ, không cần dùng regex replace nữa
    const moderationResult = JSON.parse(responseText);
    return moderationResult;

  } catch (error) {
    console.error("❌ Lỗi AI Moderation:", error.message || error);
    // Tạm thời cho phép comment đi qua nếu AI lỗi mạng
    return { isToxic: false, reason: "" }; 
  }
};

exports.generateFallbackResponse = async (message, history, dbContext = "") => {
  // Cung cấp rõ bối cảnh dữ liệu cho prompt
  const prompt = `[Dữ liệu phim từ hệ thống BossTicket: ${dbContext || "Hiện không có dữ liệu"}].\nKhách hỏi: ${message}`;

  const tryModel = async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: `Bạn là trợ lý ảo AI thông minh, thân thiện và chuyên nghiệp của rạp chiếu phim BossTicket. 
Nhiệm vụ của bạn là giải đáp các thắc mắc đa dạng của khách hàng.

Tuân thủ nghiêm ngặt các quy tắc sau:
1. Độ dài và giọng điệu: Trả lời ngắn gọn, súc tích (dưới 60 từ). Luôn thân thiện, lịch sự và có thể dùng emoji (🍿, 🎬, 🎟️) cho sinh động.
2. Về lịch chiếu/tên phim: CHỈ tư vấn dựa trên [Dữ liệu phim từ hệ thống BossTicket] được cung cấp. Tuyệt đối KHÔNG tự bịa ra tên phim, lịch chiếu hay giá vé.
3. Về dịch vụ rạp phim: Nếu khách hỏi các vấn đề chung (ví dụ: rạp có bán bắp nước không, giờ làm việc, cách lấy vé, giá vé sinh viên), hãy sử dụng kiến thức phổ thông hợp lý về rạp chiếu phim để trả lời linh hoạt.
4. Xử lý câu hỏi ngoài lề: Nếu khách hỏi những chủ đề không liên quan đến điện ảnh hay rạp phim (toán học, code, chính trị, thời tiết...), hãy từ chối khéo léo và hướng họ quay lại dịch vụ của BossTicket.
5. Thiếu thông tin: Nếu khách hỏi về một bộ phim không nằm trong danh sách dữ liệu, hãy đáp: 'Dạ, hiện tại BossTicket chưa có thông tin về phim này. Bạn có muốn tham khảo các phim đang chiếu khác tại rạp không ạ?'`,
    });

    // Sửa lỗi mapping history: Gemini yêu cầu content nằm trong mảng parts: [{text: "..."}]
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }] // File chatbot.controller.js của bạn đang gửi lên 'content' chứ không phải 'parts[0].text'
    }));

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  };

  // 🔥 Luồng xử lý chính + Retry + Fallback
  try {
    return await tryModel("gemini-2.5-flash");
  } catch (err) {
    const errorMessage = String(err.message || err.status || "");
    console.log("⚠️ Flash gặp lỗi:", errorMessage);

    if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
      try {
        console.log("⏳ Đang thử lại (Retry) sau 1 giây...");
        await new Promise(r => setTimeout(r, 1000));
        return await tryModel("gemini-2.5-flash");
      } catch (err2) {
        console.log("⚠️ Retry vẫn lỗi → Kích hoạt Fallback sang gemini-2.5-pro");
        return await tryModel("gemini-2.5-pro");
      }
    }

    throw err;
  }
};