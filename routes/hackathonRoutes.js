const express = require('express');
const router = express.Router();
const { createHackathon } = require('../controllers/hackathonController');
const { getHackathonsByOrganizer } = require('../controllers/hackathonController');

router.post('/hackathons', createHackathon);
router.get('/hackathons', getHackathonsByOrganizer);

module.exports = router;
