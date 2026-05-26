const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const taskController = require('../controllers/taskController');

// Публічний роут для результатів
router.get('/hackathon/:hackathonId/results', taskController.getResultsTable);

// Завдання
router.get('/hackathon/:hackathonId', authMiddleware, taskController.getHackathonTasks);
router.post('/hackathon/:hackathonId', authMiddleware, taskController.createTask);
router.patch('/:taskId', authMiddleware, taskController.updateTask);
router.delete('/:taskId', authMiddleware, taskController.deleteTask);

// Оцінювання
router.post('/:taskId/score/:teamId', authMiddleware, taskController.submitTaskScore);
router.get('/:taskId/score/:teamId', authMiddleware, taskController.getTaskScoreForTeam);

module.exports = router;