const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progressController');

// GET /api/progress/:userId/:videoId - Get progress for a specific user and video
router.get('/:userId/:videoId', progressController.getProgress);

// POST /api/progress/:userId/:videoId - Update progress for a specific user and video
router.post('/:userId/:videoId', progressController.updateProgress);

module.exports = router; 