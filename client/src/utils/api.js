// Use a relative URL with the API prefix
const API_URL = "/api";

/**
 * Get progress for a specific user and video
 * @param {String} userId - User ID
 * @param {String} videoId - Video ID
 * @returns {Promise} - Promise with progress data
 */
export const getProgress = async (userId, videoId) => {
  try {
    const response = await fetch(`${API_URL}/progress/${userId}/${videoId}`);

    // Handle different HTTP status codes
    if (response.status === 403) {
      console.warn(
        "Permission denied accessing progress data. Using fallback."
      );
      return {
        progress: 0,
        watchedIntervals: [],
        lastWatchedTime: 0,
        totalDuration: 0,
      };
    }

    if (!response.ok) {
      // For non-403 errors
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch progress");
      } catch {
        // If response isn't valid JSON
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }
    }

    // Handle empty responses
    const text = await response.text();
    if (!text || text.trim() === "") {
      console.warn("Empty response from server. Using fallback data.");
      return {
        progress: 0,
        watchedIntervals: [],
        lastWatchedTime: 0,
        totalDuration: 0,
      };
    }

    // Try to parse JSON
    try {
      return JSON.parse(text);
    } catch {
      console.error("Failed to parse server response");
      throw new Error("Invalid response format from server");
    }
  } catch (error) {
    console.error("Error fetching progress:", error);
    // If 404 not found or any other error, return default values
    return {
      progress: 0,
      watchedIntervals: [],
      lastWatchedTime: 0,
      totalDuration: 0,
    };
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(progressData),
    });

    // Handle different HTTP status codes
    if (response.status === 403) {
      console.warn(
        "Permission denied updating progress data. Using local fallback only."
      );
      return progressData; // Return the data we tried to send
    }

    if (!response.ok) {
      // For non-403 errors
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update progress");
      } catch {
        // If response isn't valid JSON
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }
    }

    // Handle empty responses
    const text = await response.text();
    if (!text || text.trim() === "") {
      console.warn("Empty response from server after update. Using sent data.");
      return progressData;
    }

    // Try to parse JSON
    try {
      return JSON.parse(text);
    } catch {
      console.error("Failed to parse server response");
      return progressData; // Return the data we tried to send
    }
  } catch (error) {
    console.error("Error updating progress:", error);
    return progressData; // Return the data we tried to send
  }
};
