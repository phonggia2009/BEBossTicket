const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

exports.moderateComment = async (content) => {
  try {
    // Sử dụng model gemini-1.5-flash vì nó rất nhanh và nhẹ
   const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Dặn dò AI đóng vai người kiểm duyệt và trả về chuẩn format JSON
    const prompt = `
      Bạn là một hệ thống kiểm duyệt nội dung tự động cho rạp chiếu phim.
      Hãy phân tích bình luận sau xem có chứa ngôn từ tục tĩu, xúc phạm, thù ghét, vi phạm pháp luật hoặc tiết lộ nội dung quan trọng của phim (spoil) hay không.
      Tuyệt đối CHỈ trả về một object JSON (không kèm văn bản nào khác) với định dạng sau:
      {"isToxic": true/false, "reason": "Lý do ngắn gọn bằng tiếng Việt nếu isToxic là true, nếu false thì để trống"}
      
      Bình luận cần kiểm tra: "${content}"
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // Dọn dẹp chuỗi trả về (đề phòng AI bọc JSON trong markdown ```json ... ```)
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    // Parse JSON
    const moderationResult = JSON.parse(responseText);
    return moderationResult;

  } catch (error) {
    console.error("Lỗi AI Moderation:", error);
    // Nếu AI bị lỗi kết nối hoặc timeout, ta tạm thời cho phép comment đi qua (hoặc bạn có thể chặn luôn tùy logic)
    return { isToxic: false, reason: "" }; 
  }
};

exports.generateFallbackResponse = async (message, history, dbContext = "") => {
  const prompt = `Dữ liệu từ DB: [${dbContext}]. Khách hỏi: ${message}`;

  const tryModel = async (modelName) => {
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction:
        "Bạn là AI rạp phim. Trả lời <50 từ. KHÔNG bịa tên phim. Chỉ dựa vào dữ liệu DB được cung cấp. Nếu không có thông tin, báo 'Hiện chưa có phim này'",
    });

    const chat = model.startChat({ history });
    const result = await chat.sendMessage(prompt);
    return result.response.text();
  };

  // 🔥 Retry + fallback
  try {
    return await tryModel("gemini-flash-latest");
  } catch (err) {
    console.log("⚠️ Flash lỗi:", err.status);

    // 👉 Retry 1 lần
    if (err.status === 503) {
      try {
        await new Promise(r => setTimeout(r, 1000));
        return await tryModel("gemini-flash-latest");
      } catch (err2) {
        console.log("⚠️ Retry vẫn lỗi → fallback sang PRO");

        // 👉 Fallback model
        return await tryModel("gemini-1.5-pro");
      }
    }

    throw err;
  }
};