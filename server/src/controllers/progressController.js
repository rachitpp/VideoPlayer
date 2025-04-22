const Progress = require('../models/Progress');
const { mergeIntervals, calculateProgress } = require('../utils/intervalUtils');

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
          message: 'No progress found for this user and video',
          storageType: 'in-memory'
        });
      }
      
      return res.status(200).json({
        ...inMemoryData,
        storageType: 'in-memory'
      });
    }
    
    // If MongoDB is connected, use it
    const progress = await Progress.findOne({ userId, videoId });
    
    if (!progress) {
      return res.status(404).json({ 
        message: 'No progress found for this user and video',
        storageType: 'mongodb'
      });
    }
    
    res.status(200).json({
      progress: progress.progress,
      watchedIntervals: progress.watchedIntervals,
      lastWatchedTime: progress.lastWatchedTime,
      totalDuration: progress.totalDuration,
      storageType: 'mongodb'
    });
  } catch (error) {
    console.error('Error fetching progress:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * Update progress for a specific user and video
 */
exports.updateProgress = async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const { newIntervals, totalDuration } = req.body;
    
    console.log(`Updating progress for ${userId}/${videoId}:`, {
      newIntervals,
      totalDuration,
      lastWatchedTime: req.body.lastWatchedTime
    });
    
    if (!newIntervals || !Array.isArray(newIntervals) || !totalDuration) {
      return res.status(400).json({ 
        message: 'Invalid request. newIntervals array and totalDuration are required' 
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
          totalDuration
        };
      }
      
      // Update the last watched time if provided
      if (req.body.lastWatchedTime !== undefined) {
        existingData.lastWatchedTime = req.body.lastWatchedTime;
      }
      
      // Merge new intervals with existing ones
      const allIntervals = [...existingData.watchedIntervals, ...newIntervals];
      const mergedIntervals = mergeIntervals(allIntervals);
      
      console.log('Merged intervals:', mergedIntervals);
      
      // Calculate new progress percentage
      const newProgress = calculateProgress(mergedIntervals, totalDuration);
      console.log(`Calculated progress: ${newProgress}%`);
      
      // Update data
      const updatedData = {
        watchedIntervals: mergedIntervals,
        progress: newProgress,
        lastWatchedTime: existingData.lastWatchedTime,
        totalDuration
      };
      
      // Save to in-memory store
      global.inMemoryStore.saveProgress(userId, videoId, updatedData);
      
      return res.status(200).json({
        message: 'Progress updated successfully',
        progress: newProgress,
        watchedIntervals: mergedIntervals,
        lastWatchedTime: existingData.lastWatchedTime,
        totalDuration,
        storageType: 'in-memory'
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
        totalDuration
      });
    }
    
    // Update the last watched time if provided
    if (req.body.lastWatchedTime !== undefined) {
      progress.lastWatchedTime = req.body.lastWatchedTime;
    }
    
    // Merge new intervals with existing ones
    const allIntervals = [...progress.watchedIntervals, ...newIntervals];
    const mergedIntervals = mergeIntervals(allIntervals);
    
    // Calculate new progress percentage
    const newProgress = calculateProgress(mergedIntervals, totalDuration);
    
    // Update progress document
    progress.watchedIntervals = mergedIntervals;
    progress.progress = newProgress;
    progress.totalDuration = totalDuration;
    
    await progress.save();
    
    res.status(200).json({
      message: 'Progress updated successfully',
      progress: newProgress,
      watchedIntervals: mergedIntervals,
      lastWatchedTime: progress.lastWatchedTime,
      storageType: 'mongodb'
    });
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 