const express = require('express');
const router = express.Router();
const teamController = require('../controllers/teamController');
const authMiddleware = require('../middleware/authMiddleware');

// <Команди>
// Роут для створення команди
router.post('/', authMiddleware, teamController.createTeam);
//Роут для отримання всіх команд хакатону
router.get('/hackathon/:hackathonId', authMiddleware, teamController.getHackathonTeams);
// Роут для отримання команд що шукають учасників
router.get('/hackathon/:hackathonId/looking', authMiddleware, teamController.getTeamsLookingForMembers);
// Роут для отримання всіх команд де присутній користувач
router.get('/my/teams', authMiddleware, teamController.getMyTeams);
// Роут для отримання статистики команд для організатора
router.get('/hackathon/:hackathonId/stats', authMiddleware, teamController.getTeamsStats);
// Роут для отримання даних/деталів команди
router.get('/:teamId', authMiddleware, teamController.getTeamDetails);
// Роут для оновлення даних команди
router.patch('/:teamId', authMiddleware, teamController.updateTeam);
// Роут для видалення команди (організатором)
router.delete('/:teamId', authMiddleware, teamController.deleteTeam);
// Роут для ручного додавання учасника (організатором)
router.post('/:teamId/add-member', authMiddleware, teamController.addMemberByOrganizer);

// <Заявки>
// Роут для подачі заявки в команду
router.post('/:teamId/apply', authMiddleware, teamController.applyToTeam);
// Роут для прийняття або відхилення заявки капітаном
router.patch('/applications/:applicationId', authMiddleware, teamController.handleApplication);

// <Керування командою>
// Роут для видалення учасника з команди капітаном
router.delete('/:teamId/members/:memberId', authMiddleware, teamController.removeMemberFromTeam);

// <Організатор>
// Роут для автоматичного розподілу команд
router.post('/hackathon/:hackathonId/auto-match', authMiddleware, teamController.autoMatchmaking);
// Роут для заблокування всіх команд
router.post('/hackathon/:hackathonId/lock', authMiddleware, teamController.lockAllTeams);

module.exports = router;