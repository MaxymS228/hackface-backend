const express = require('express');
const router = express.Router();
const hackathonController = require('../controllers/hackathonController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Роут для створення хакатону (потрібна авторизація + завантаження 1 файлу 'banner')
router.post('/', authMiddleware, upload.single('banner'), hackathonController.createHackathon);

// Роут для отримання всіх хакатонів
router.get('/', hackathonController.getAllHackathons);

// Роут для отримання хакатонів організатора
router.get('/my-hackathons', authMiddleware, hackathonController.getMyHackathons);

// Роут для отримання всіх активних інвайтів поточного користувача
router.get('/my-invitations', authMiddleware, hackathonController.getMyInvitations);

// Роут для отримання загальної кількості учасників на всіх хакатонах
router.get('/stats', hackathonController.getTotalStats);

// Роут для отримання певного (особливого) запрошення на хакатон
router.get('/members/:memberId/details', authMiddleware, hackathonController.getInviteDetails);

// Роут для прийняття/відхилення запрошення (користувачем)
router.patch('/members/:memberId/respond', authMiddleware, hackathonController.respondToInvite);

// Роут для отримання одного хакатону за ID (публічний доступ)
router.get('/:id', hackathonController.getHackathonById);

// Роут для отримання логів відхилення
router.get('/:id/invite-logs', authMiddleware, hackathonController.getInviteLogs);

// Роут для видалення логів
router.delete('/:id/invite-logs/:logId', authMiddleware, hackathonController.deleteInviteLog);

// Роут для оновлення хакатону (потрібен ID хакатону в URL)
router.put('/:id', authMiddleware, upload.single('banner'), hackathonController.updateHackathon);

// Роут для приєднання користувача до хакатону
router.post('/:id/join', authMiddleware, hackathonController.joinHackathon);

// Роут для залишення та видалення користувача з хакатону
router.delete('/:id/leave', authMiddleware, hackathonController.leaveHackathon);

// Роут для видалення учасника хакатону організатором
router.delete('/:id/participants/:memberId', authMiddleware, hackathonController.removeParticipant);

// Роут для відправки запрошення (організатором)
router.post('/:id/invite', authMiddleware, hackathonController.inviteToHackathon);

// Роут для видалення членів команди
router.delete('/:id/members/:memberId', authMiddleware, hackathonController.removeMemberHackathon);

// Роут для отримання аналітики хакатону
router.get('/:id/analytics', authMiddleware, hackathonController.getHackathonAnalytics);

// Роут для оновлення кількісті переглядів хакатону
router.post('/:id/view', hackathonController.incrementViews);

// Роут для отримання ролі користувача
router.get('/:id/my-role', authMiddleware, hackathonController.checkMyRole);



module.exports = router;