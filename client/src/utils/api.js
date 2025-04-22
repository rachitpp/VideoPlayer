const API_URL = 'http://localhost:5000/api';

/**
 * Get progress for a specific user and video
 * @param {String} userId - User ID
 * @param {String} videoId - Video ID
 * @returns {Promise} - Promise with progress data
 */
export const getProgress = async (userId, videoId) => {
  try {
    const response = await fetch(`${API_URL}/progress/${userId}/${videoId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to fetch progress');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching progress:', error);
    // If 404 not found, return default values
    if (error.message.includes('No progress found')) {
      return {
        progress: 0,
        watchedIntervals: [],
        lastWatchedTime: 0,
        totalDuration: 0
      };
    }
    throw error;
  }
};

/**
 * Update progress for a specific user and video
 * @param {String} userId - User ID
 * @param {String} videoId - Video ID
 * @param {Object} progressData - Progress data to update
 * @returns {Promise} - Promise with updated progress data
 */
export const updateProgress = async (userId, videoId, progressData) => {
  try {
    const response = await fetch(`${API_URL}/progress/${userId}/${videoId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(progressData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to update progress');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
}; 