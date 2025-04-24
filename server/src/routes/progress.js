const express = require("express");
const router = express.Router();
const progressController = require("../controllers/progressController");

// Get a user's progress for a specific video
router.get("/:userId/:videoId", progressController.getProgress);

// Save updated progress for a video
router.post("/:userId/:videoId", progressController.updateProgress);

module.exports = router;
