const express = require('express');
const router = express.Router();
const { registerUser, loginUser, verifyEmail, googleAuth } = require('../controllers/authController');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/verify/:token', verifyEmail);
router.post('/google-auth', googleAuth);

module.exports = router;