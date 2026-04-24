const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.moderateComment = async (content) => {
  try {
    // 1. Sửa lại đúng tên model: gemini-1.5-flash
    // 2. Bổ sung generationConfig ép API trả về chuẩn JSON 100%
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
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
  const prompt = `Dữ liệu từ DB: [${dbContext}]. Khách hỏi: ${message}`;

  const tryModel = async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: "Bạn là AI hỗ trợ của rạp phim BossTicket. Trả lời ngắn gọn dưới 50 từ. KHÔNG bịa tên phim. Chỉ dựa vào dữ liệu DB được cung cấp. Nếu không có thông tin, báo 'Hiện chưa có lịch chiếu cho phim này'",
    });

    // Lưu ý: history truyền vào phải đúng chuẩn mảng object: [{role: "user"|"model", parts: [{text: "..."}]}]
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  };

  // 🔥 Luồng xử lý chính + Retry + Fallback
  try {
    // Dùng bản 1.5-flash cụ thể thay vì "latest" để tránh lỗi không tương thích khi Google update
    return await tryModel("gemini-1.5-flash");
  } catch (err) {
    const errorMessage = String(err.message || err.status || "");
    console.log("⚠️ Flash gặp lỗi:", errorMessage);

    // Bắt lỗi quá tải (503) an toàn hơn, vì SDK có thể ném lỗi dạng string chứa "503 Service Unavailable"
    if (errorMessage.includes("503") || errorMessage.includes("overloaded")) {
      try {
        console.log("⏳ Đang thử lại (Retry) sau 1 giây...");
        await new Promise(r => setTimeout(r, 1000));
        return await tryModel("gemini-1.5-flash");
      } catch (err2) {
        console.log("⚠️ Retry vẫn lỗi → Kích hoạt Fallback sang gemini-1.5-pro");
        return await tryModel("gemini-1.5-pro");
      }
    }

    // Nếu không phải lỗi 503 (VD: sai API key, lỗi 400), ném lỗi ra ngoài
    throw err;
  }
};