const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const assessmentController = require('../controllers/assessmentController');

// Отримати статистику для ManageSubmissions
router.get('/hackathon/:hackathonId/stats', authMiddleware, assessmentController.getSubmissionsStats);

// Авторозподіл проєктів між журі
router.post('/hackathon/:hackathonId/auto-assign', authMiddleware, assessmentController.autoAssignJury);

// Ручне призначення судді до проєкту
router.post('/project/:projectId/assign-jury', authMiddleware, assessmentController.assignJuryToProject);

// Видалення судді з проєкту
router.delete('/project/:projectId/assign-jury/:juryId', authMiddleware, assessmentController.removeJuryFromProject);

// Виставити оцінку (для журі)
router.post('/project/:projectId/score', authMiddleware, assessmentController.submitScore);

// Отримати оцінки проєкту
router.get('/project/:projectId/scores', authMiddleware, assessmentController.getProjectScores);

// Отримати проєкти призначені поточному журі
router.get('/hackathon/:hackathonId/my-projects', authMiddleware, assessmentController.getMyAssignedProjects);

module.exports = router;