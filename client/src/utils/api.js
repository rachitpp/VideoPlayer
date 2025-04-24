// API URL relative to the server - easier for different environments
const API_URL = "/api";

// Fetches progress for a specific user and video combination
export const getProgress = async (userId, videoId) => {
  try {
    const response = await fetch(`${API_URL}/progress/${userId}/${videoId}`);

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
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch progress");
      } catch {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }
    }

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

    try {
      return JSON.parse(text);
    } catch {
      console.error("Failed to parse server response");
      throw new Error("Invalid response format from server");
    }
  } catch (error) {
    console.error("Error fetching progress:", error);
    return {
      progress: 0,
      watchedIntervals: [],
      lastWatchedTime: 0,
      totalDuration: 0,
    };
  }
};

// Sends updated progress data to the server
export const updateProgress = async (userId, videoId, progressData) => {
  try {
    const response = await fetch(`${API_URL}/progress/${userId}/${videoId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(progressData),
    });

    if (response.status === 403) {
      console.warn(
        "Permission denied updating progress data. Using local fallback only."
      );
      return progressData;
    }

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update progress");
      } catch {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`
        );
      }
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      console.warn("Empty response from server after update. Using sent data.");
      return progressData;
    }

    try {
      return JSON.parse(text);
    } catch {
      console.error("Failed to parse server response");
      return progressData;
    }
  } catch (error) {
    console.error("Error updating progress:", error);
    return progressData;
  }
};
