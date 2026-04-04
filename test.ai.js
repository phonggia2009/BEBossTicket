require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  console.log("Đang tải danh sách model...");
  // Lưu ý: Hàm này yêu cầu thư viện @google/generative-ai bản mới
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  
  console.log("=== DANH SÁCH MODEL BẠN CÓ THỂ DÙNG ===");
  data.models.forEach(m => console.log(m.name));
}

listModels();