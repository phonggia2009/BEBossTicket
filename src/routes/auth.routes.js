const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Định nghĩa endpoint: POST http://localhost:5000/api/auth/login
router.post('/login', authController.login);
router.post('/google', authController.loginGoogle);
router.post('/register', authController.register);
router.get('/verify-account', authController.verifyAccount);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
module.exports = router;