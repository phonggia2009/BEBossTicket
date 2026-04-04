const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middlewares/authMiddleware');

router.get('/profile', protect, userController.getProfile);
router.get('/',        protect, restrictTo('ADMIN'), userController.getAllUsers);   // GET  /users?page=1&limit=15&role=USER&search=...
router.get('/:id',     protect, restrictTo('ADMIN'), userController.getUserById);   // GET  /users/:id
router.patch('/:id/role', protect, restrictTo('ADMIN'), userController.updateUserRole); // PATCH /users/:id/role  { role: 'ADMIN'|'USER' }
router.delete('/:id',  protect, restrictTo('ADMIN'), userController.deleteUser);   // DELETE /users/:id
router.patch('/profile', protect, userController.updateProfile);
module.exports = router;