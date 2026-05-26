const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middleware/upload');

// ВАЖЛИВО: Вам потрібен ваш middleware, який перевіряє JWT токен
const authMiddleware = require('../middleware/authMiddleware');

// --- ПРИВАТНІ МАРШРУТИ (Тільки для авторизованих, використовуємо authMiddleware) ---

// Отримати свої дані 
router.get('/me', authMiddleware, userController.getCurrentUser);

// Оновлення дані (PUT /api/users/me)
router.put('/me', authMiddleware, upload.fields([
  { name: 'avatar', maxCount: 1 }, 
  { name: 'banner', maxCount: 1 }
]), userController.updateProfile);

// Зміна паролю
router.put('/change-password', authMiddleware, userController.changePassword);

// Роут для отримання публічного профілю за ID (GET /api/users/:id)
router.get('/:id', userController.getPublicProfile);

// Роут для отримання статистики профілю
router.get('/:id/stats', userController.getUserStats);

module.exports = router;