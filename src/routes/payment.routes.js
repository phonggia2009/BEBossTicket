const express = require('express');
const router  = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect } = require('../middlewares/authMiddleware'); 

// ─── VNPay routes (không cần auth - VNPay và browser gọi vào) ────────────────
router.get ('/vnpay/return', paymentController.vnpayReturn);
router.post('/vnpay/ipn',    paymentController.vnpayIpn);

// ─── Tạo lại URL thanh toán nếu cần (có auth) ────────────────────────────────
router.post('/create-vnpay-url', protect, paymentController.createVnpayUrl); 

module.exports = router;