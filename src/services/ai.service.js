const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.moderateComment = async (content) => {
  try {
    const prompt = `
Bạn là hệ thống kiểm duyệt nội dung cho rạp phim BossTicket.

Phân tích bình luận sau xem có:
- tục tĩu
- xúc phạm
- thù ghét
- vi phạm pháp luật
- spoil phim

hay không.

CHỈ trả JSON:

{
  "isToxic": boolean,
  "reason": "string"
}

Bình luận:
"${content}"
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",

      messages: [
        {
          role: "system",
          content: "Bạn là AI kiểm duyệt nội dung.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],

      response_format: {
        type: "json_object",
      },

      temperature: 0.2,
    });

    const text = response.choices[0].message.content;

    return JSON.parse(text);

  } catch (error) {
    console.error("❌ Lỗi AI Moderation:", error);

    return {
      isToxic: false,
      reason: "",
    };
  }
};

/**
 * CHATBOT
 */
exports.generateFallbackResponse = async (
  message,
  history,
  dbContext = ""
) => {
  try {
    const messages = [
      {
        role: "system",
        content:
          "Bạn là AI hỗ trợ của rạp phim BossTicket. Trả lời ngắn gọn dưới 50 từ. KHÔNG bịa thông tin. Chỉ dựa vào dữ liệu được cung cấp.",
      },
    ];

    // Convert history Gemini -> OpenAI
    if (history && Array.isArray(history)) {
      history.forEach((item) => {
        messages.push({
          role: item.role === "model" ? "assistant" : "user",
          content: item.parts?.[0]?.text || "",
        });
      });
    }

    messages.push({
      role: "user",
      content: `
Dữ liệu DB:
${dbContext}

Khách hỏi:
${message}
`,
    });

    const response =
      await openai.chat.completions.create({
        model: "gpt-4.1-mini",

        messages,

        temperature: 0.7,

        max_tokens: 200,
      });

    return response.choices[0].message.content;

  } catch (error) {
    console.error(
      "[ChatbotService] Error:",
      error
    );

    return "Xin lỗi, AI hiện tạm thời không khả dụng.";
  }
};