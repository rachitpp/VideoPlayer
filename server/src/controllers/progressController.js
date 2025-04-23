const Progress = require("../models/Progress");
const { mergeIntervals, calculateProgress } = require("../utils/intervalUtils");

/**
 * Get progress for a specific user and video
 */
exports.getProgress = async (req, res) => {
  try {
    const { userId, videoId } = req.params;

    // If MongoDB is not connected, use in-memory store
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

    // If MongoDB is connected, use it
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

/**
 * Update progress for a specific user and video
 */
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

    // If MongoDB is not connected, use in-memory store
    if (!global.isDbConnected) {
      // Get existing progress data
      let existingData = global.inMemoryStore.getProgress(userId, videoId);

      if (!existingData) {
        existingData = {
          watchedIntervals: [],
          progress: 0,
          lastWatchedTime: 0,
          totalDuration,
        };
      }

      // Update the last watched time if provided
      if (req.body.lastWatchedTime !== undefined) {
        existingData.lastWatchedTime = req.body.lastWatchedTime;
      }

      // Create copies of intervals to avoid reference issues
      const deepCopyIntervals = (arr) =>
        arr.map((interval) => ({ ...interval }));

      // Merge new intervals with existing ones
      const allIntervals = [
        ...deepCopyIntervals(existingData.watchedIntervals),
        ...deepCopyIntervals(newIntervals),
      ];
      const mergedIntervals = mergeIntervals(allIntervals);

      console.log("Merged intervals:", mergedIntervals.length);

      // Calculate new progress percentage
      const newProgress = calculateProgress(mergedIntervals, totalDuration);
      console.log(`Calculated progress: ${newProgress}%`);

      // Determine final progress - respect forceProgress if provided
      let finalProgress;
      if (forceProgress !== undefined) {
        // If client explicitly sent a progress value, respect it
        finalProgress = forceProgress;
        console.log(`Using client-provided forced progress: ${finalProgress}%`);
      } else {
        // Otherwise ensure progress never goes backward
        finalProgress = Math.max(newProgress, existingData.progress || 0);

        if (finalProgress !== newProgress) {
          console.log(
            `Progress would have decreased from ${existingData.progress}% to ${newProgress}%. Keeping higher value.`
          );
        }
      }

      // Update data
      const updatedData = {
        watchedIntervals: mergedIntervals,
        progress: finalProgress,
        lastWatchedTime: existingData.lastWatchedTime,
        totalDuration,
      };

      // Save to in-memory store
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

    // If MongoDB is connected, use normal flow
    // Find existing progress or create new one
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

    // Update the last watched time if provided
    if (req.body.lastWatchedTime !== undefined) {
      progress.lastWatchedTime = req.body.lastWatchedTime;
    }

    // Create copies of intervals to avoid reference issues
    const deepCopyIntervals = (arr) => arr.map((interval) => ({ ...interval }));

    // Merge new intervals with existing ones
    const allIntervals = [
      ...deepCopyIntervals(progress.watchedIntervals),
      ...deepCopyIntervals(newIntervals),
    ];
    const mergedIntervals = mergeIntervals(allIntervals);

    // Calculate new progress percentage
    const newProgress = calculateProgress(mergedIntervals, totalDuration);

    // Determine final progress - respect forceProgress if provided
    let finalProgress;
    if (forceProgress !== undefined) {
      // If client explicitly sent a progress value, respect it
      finalProgress = forceProgress;
      console.log(`Using client-provided forced progress: ${finalProgress}%`);
    } else {
      // Otherwise ensure progress never goes backward
      finalProgress = Math.max(newProgress, progress.progress || 0);

      if (finalProgress !== newProgress) {
        console.log(
          `Progress would have decreased from ${progress.progress}% to ${newProgress}%. Keeping higher value.`
        );
      }
    }

    // Update progress document
    progress.watchedIntervals = mergedIntervals;
    progress.progress = finalProgress;
    progress.totalDuration = totalDuration;

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
