const express = require('express');
const router = express.Router();
const { createTeam, joinTeam } = require('../controllers/teamController');
const { getTeamByUser } = require('../controllers/teamController');


router.post('/teams', createTeam);
router.post('/teams/join', joinTeam);
router.get('/my-team', getTeamByUser);

module.exports = router;
