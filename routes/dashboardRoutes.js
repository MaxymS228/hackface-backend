const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/authMiddleware');

// Маршрут: GET /api/dashboard/:userId
router.get('/:userId', authMiddleware, dashboardController.getDashboardSummary);

module.exports = router;