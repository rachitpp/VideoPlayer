const Progress = require("../models/Progress");
const { mergeIntervals, calculateProgress } = require("../utils/intervalUtils");

// Make sure intervals are properly formatted
function validateIntervals(intervals) {
  if (!intervals || !Array.isArray(intervals)) return false;

  return intervals.every(
    (interval) =>
      interval &&
      typeof interval === "object" &&
      Number.isFinite(interval.start) &&
      Number.isFinite(interval.end) &&
      interval.start >= 0 &&
      interval.end >= interval.start
  );
}

// Retrieve progress data for a user/video combination
exports.getProgress = async (req, res) => {
  try {
    const { userId, videoId } = req.params;

    // Fall back to in-memory if MongoDB is down
    if (!global.isDbConnected) {
      const inMemoryData = global.inMemoryStore.getProgress(userId, videoId);

      if (!inMemoryData) {
        return res.status(404).json({
          message: "No progress found for this user and video",
          storageType: "in-memory",
        });
      }

      return res.status(200).json({
        ...inMemoryData,
        storageType: "in-memory",
      });
    }

    // Normal MongoDB flow
    const progress = await Progress.findOne({ userId, videoId });

    if (!progress) {
      return res.status(404).json({
        message: "No progress found for this user and video",
        storageType: "mongodb",
      });
    }

    res.status(200).json({
      progress: progress.progress,
      watchedIntervals: progress.watchedIntervals,
      lastWatchedTime: progress.lastWatchedTime,
      totalDuration: progress.totalDuration,
      storageType: "mongodb",
    });
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a user's progress for a specific video
exports.updateProgress = async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const { newIntervals, totalDuration, forceProgress } = req.body;

    console.log(`Updating progress for ${userId}/${videoId}:`, {
      newIntervals: newIntervals ? newIntervals.length : 0,
      totalDuration,
      lastWatchedTime: req.body.lastWatchedTime,
      forceProgress: forceProgress || "not provided",
    });

    if (!newIntervals || !Array.isArray(newIntervals) || !totalDuration) {
      return res.status(400).json({
        message:
          "Invalid request. newIntervals array and totalDuration are required",
      });
    }

    // Make sure intervals are formatted properly
    if (!validateIntervals(newIntervals)) {
      return res.status(400).json({
        message:
          "Invalid intervals format. Each interval must have valid start and end properties",
      });
    }

    // Use in-memory store if MongoDB isn't available
    if (!global.isDbConnected) {
      // Get existing data or create defaults
      let existingData = global.inMemoryStore.getProgress(userId, videoId);

      if (!existingData) {
        existingData = {
          watchedIntervals: [],
          progress: 0,
          lastWatchedTime: 0,
          totalDuration,
        };
      }

      // Update last position if provided
      if (req.body.lastWatchedTime !== undefined) {
        existingData.lastWatchedTime = req.body.lastWatchedTime;
      }

      // Create copies to avoid reference issues
      const deepCopyIntervals = (arr) =>
        arr.map((interval) => ({ ...interval }));

      // Combine existing and new intervals
      const allIntervals = [
        ...deepCopyIntervals(existingData.watchedIntervals),
        ...deepCopyIntervals(newIntervals),
      ];
      const mergedIntervals = mergeIntervals(allIntervals);

      console.log("Merged intervals:", mergedIntervals.length);

      // Calculate updated progress
      const newProgress = calculateProgress(mergedIntervals, totalDuration);
      console.log(`Calculated progress: ${newProgress}%`);

      // Use client's progress value if provided, otherwise ensure we never go backward
      let finalProgress;
      if (forceProgress !== undefined) {
        finalProgress = forceProgress;
        console.log(`Using client-provided forced progress: ${finalProgress}%`);
      } else {
        finalProgress = Math.max(newProgress, existingData.progress || 0);

        if (finalProgress !== newProgress) {
          console.log(
            `Progress would have decreased from ${existingData.progress}% to ${newProgress}%. Keeping higher value.`
          );
        }
      }

      // Prepare the updated data
      const updatedData = {
        watchedIntervals: mergedIntervals,
        progress: finalProgress,
        lastWatchedTime: existingData.lastWatchedTime,
        totalDuration,
      };

      // Save to memory
      global.inMemoryStore.saveProgress(userId, videoId, updatedData);

      return res.status(200).json({
        message: "Progress updated successfully",
        progress: finalProgress,
        watchedIntervals: mergedIntervals,
        lastWatchedTime: existingData.lastWatchedTime,
        totalDuration,
        storageType: "in-memory",
      });
    }

    // MongoDB is connected - normal flow
    let progress = await Progress.findOne({ userId, videoId });

    if (!progress) {
      progress = new Progress({
        userId,
        videoId,
        watchedIntervals: [],
        progress: 0,
        lastWatchedTime: 0,
        totalDuration,
      });
    }

    // Update last position if provided
    if (req.body.lastWatchedTime !== undefined) {
      progress.lastWatchedTime = req.body.lastWatchedTime;
    }

    // Create copies to avoid reference issues
    const deepCopyIntervals = (arr) => arr.map((interval) => ({ ...interval }));

    // Combine existing and new intervals
    const allIntervals = [
      ...deepCopyIntervals(progress.watchedIntervals),
      ...deepCopyIntervals(newIntervals),
    ];
    const mergedIntervals = mergeIntervals(allIntervals);

    console.log("Merged intervals:", mergedIntervals.length);

    // Calculate updated progress
    const newProgress = calculateProgress(mergedIntervals, totalDuration);
    console.log(`Calculated progress: ${newProgress}%`);

    // Don't let progress go backward unless explicitly told to
    let finalProgress;
    if (forceProgress !== undefined) {
      finalProgress = forceProgress;
      console.log(`Using client-provided forced progress: ${finalProgress}%`);
    } else {
      finalProgress = Math.max(newProgress, progress.progress);

      if (finalProgress !== newProgress) {
        console.log(
          `Progress would have decreased from ${progress.progress}% to ${newProgress}%. Keeping higher value.`
        );
      }
    }

    // Update the document
    progress.watchedIntervals = mergedIntervals;
    progress.progress = finalProgress;
    progress.totalDuration = totalDuration;

    // Save to MongoDB
    await progress.save();

    res.status(200).json({
      message: "Progress updated successfully",
      progress: finalProgress,
      watchedIntervals: mergedIntervals,
      lastWatchedTime: progress.lastWatchedTime,
      totalDuration,
      storageType: "mongodb",
    });
  } catch (error) {
    console.error("Error updating progress:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
