const express = require('express');
const router = express.Router();
const hackathonController = require('../controllers/hackathonController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Створення хакатону (потрібна авторизація + завантаження 1 файлу 'banner')
router.post('/', authMiddleware, upload.single('banner'), hackathonController.createHackathon);

// Отримання хакатонів організатора
router.get('/my-hackathons', authMiddleware, hackathonController.getMyHackathons);

// Оновлення хакатону (потрібен ID хакатону в URL)
router.put('/:id', authMiddleware, upload.single('banner'), hackathonController.updateHackathon);

module.exports = router;

// const express = require('express');
// const router = express.Router();
// const { createHackathon } = require('../controllers/hackathonController');
// const { getHackathonsByOrganizer } = require('../controllers/hackathonController');

// router.post('/hackathons', createHackathon);
// router.get('/hackathons', getHackathonsByOrganizer);

// module.exports = router;
