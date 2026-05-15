const express = require('express');
const router = express.Router();
const hackathonController = require('../controllers/hackathonController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Створення хакатону (потрібна авторизація + завантаження 1 файлу 'banner')
router.post('/', authMiddleware, upload.single('banner'), hackathonController.createHackathon);

// Отримання хакатонів організатора
router.get('/my-hackathons', authMiddleware, hackathonController.getMyHackathons);

// Отримання одного хакатону за ID (публічний доступ)
router.get('/:id', hackathonController.getHackathonById);

// Оновлення хакатону (потрібен ID хакатону в URL)
router.put('/:id', authMiddleware, upload.single('banner'), hackathonController.updateHackathon);

// Приєднання користувача до хакатону
router.post('/:id/join', authMiddleware, hackathonController.joinHackathon);

// Залишення та видалення користувача з хакатону
router.delete('/:id/leave', authMiddleware, hackathonController.leaveHackathon);

// Роут для отримання певного (особливого) запрошення на хакатон
router.get('/members/:memberId/details', authMiddleware, hackathonController.getInviteDetails);

// Роут для прийняття/відхилення запрошення (користувачем)
router.patch('/members/:memberId/respond', authMiddleware, hackathonController.respondToInvite);

// Видалення учасника хакатону організатором
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

// const express = require('express');
// const router = express.Router();
// const { createHackathon } = require('../controllers/hackathonController');
// const { getHackathonsByOrganizer } = require('../controllers/hackathonController');

// router.post('/hackathons', createHackathon);
// router.get('/hackathons', getHackathonsByOrganizer);

// module.exports = router;
