const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const submissionController = require('../controllers/submissionController');

// Отримати всі проєкти хакатону (для організатора)
router.get('/hackathon/:hackathonId', authMiddleware, submissionController.getHackathonProjects);

// Отримати проєкт команди
router.get('/team/:teamId', authMiddleware, submissionController.getProjectByTeam);

// Здати або оновити проєкт
router.post('/team/:teamId', authMiddleware, submissionController.submitProject);

module.exports = router;