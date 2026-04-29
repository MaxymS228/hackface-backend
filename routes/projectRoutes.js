const express = require('express');
const router = express.Router();
const { submitProject } = require('../controllers/projectController');
const { getProjectsByUser } = require('../controllers/projectController');
const upload = require('../middleware/upload');

// multipart/form-data + upload.single('file')
router.post('/projects', upload.single('file'), submitProject);
router.get('/my-projects', getProjectsByUser);

module.exports = router;
