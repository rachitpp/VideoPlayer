import { useState, useEffect, useRef } from "react";
import { getProgress, updateProgress } from "../utils/api";
import {
  mergeIntervals,
  calculateProgress,
  isSecondWatched,
} from "../utils/intervalUtils";

// Local storage key for progress
const getLocalStorageKey = (userId, videoId) =>
  `video_progress_${userId}_${videoId}`;

/**
 * Custom hook for managing video progress
 * @param {String} userId - User ID
 * @param {String} videoId - Video ID
 * @returns {Object} - Video progress state and handlers
 */
export default function useVideoProgress(userId, videoId) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchedIntervals, setWatchedIntervals] = useState([]);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [lastWatchedTime, setLastWatchedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  // Current watching interval
  const currentIntervalRef = useRef(null);
  // Tracked seconds for current interval
  const watchedSecondsRef = useRef(new Set());
  // Timer for sending updates to server
  const updateTimerRef = useRef(null);
  // Current time ref for the timer
  const currentTimeRef = useRef(0);
  // Last saved intervals from server
  const lastSavedIntervalsRef = useRef([]);
  // Flag to track if a server sync is in progress
  const isSyncingRef = useRef(false);
  // Track the highest progress percentage we've seen
  const highestProgressRef = useRef(0);

  // Load any progress from local storage
  const loadLocalProgress = () => {
    try {
      const key = getLocalStorageKey(userId, videoId);
      const savedData = localStorage.getItem(key);

      if (savedData) {
        const data = JSON.parse(savedData);
        console.log("Loaded local progress data:", data);
        return data;
      }
    } catch (err) {
      console.error("Failed to load progress from local storage:", err);
    }
    return null;
  };

  // Save progress to local storage
  const saveLocalProgress = (data) => {
    try {
      const key = getLocalStorageKey(userId, videoId);
      localStorage.setItem(key, JSON.stringify(data));
      console.log("Saved progress to local storage");
    } catch (err) {
      console.error("Failed to save progress to local storage:", err);
    }
  };

  // Fetch initial progress data
  useEffect(() => {
    async function fetchProgress() {
      try {
        setLoading(true);

        // First check local storage for cached progress
        const localData = loadLocalProgress();

        // Then fetch from server
        const serverData = await getProgress(userId, videoId);
        console.log("Fetched server progress data:", serverData);

        // Determine which progress data to use (use higher progress value)
        let finalData = serverData;

        if (localData) {
          // If local data has higher progress, use it but merge intervals
          if (localData.progress > serverData.progress) {
            console.log("Local progress is higher, using local data");
            finalData = {
              ...serverData,
              progress: localData.progress,
              watchedIntervals: mergeIntervals([
                ...(serverData.watchedIntervals || []),
                ...(localData.watchedIntervals || []),
              ]),
            };

            // Immediately sync the merged data back to server
            setTimeout(() => {
              updateProgress(userId, videoId, {
                newIntervals: finalData.watchedIntervals,
                lastWatchedTime: finalData.lastWatchedTime,
                totalDuration: finalData.totalDuration,
              }).catch((err) =>
                console.error("Error syncing merged progress:", err)
              );
            }, 1000);
          }
        }

        setWatchedIntervals(finalData.watchedIntervals || []);
        lastSavedIntervalsRef.current = [...(finalData.watchedIntervals || [])];
        setProgressPercentage(finalData.progress || 0);
        highestProgressRef.current = finalData.progress || 0;
        setLastWatchedTime(finalData.lastWatchedTime || 0);
        if (finalData.totalDuration) {
          setTotalDuration(finalData.totalDuration);
        }

        // Save the final data to local storage
        saveLocalProgress(finalData);

        setError(null);
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch progress:", err);

        // If server fetch fails, still try to load from local storage
        const localData = loadLocalProgress();
        if (localData) {
          console.log("Using local progress data due to server error");
          setWatchedIntervals(localData.watchedIntervals || []);
          lastSavedIntervalsRef.current = [
            ...(localData.watchedIntervals || []),
          ];
          setProgressPercentage(localData.progress || 0);
          highestProgressRef.current = localData.progress || 0;
          setLastWatchedTime(localData.lastWatchedTime || 0);
          if (localData.totalDuration) {
            setTotalDuration(localData.totalDuration);
          }
        }
      } finally {
        setLoading(false);
      }
    }

    fetchProgress();

    // Clean up timer on unmount
    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [userId, videoId]);

  /**
   * Start tracking a new watching interval
   * @param {Number} currentTime - Current video time in seconds
   */
  const startWatchingInterval = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;

    const roundedTime = Math.floor(currentTime);
    currentTimeRef.current = roundedTime;

    console.log("Starting interval at:", roundedTime);

    // Don't track if this second is already in watched intervals
    if (isSecondWatched(roundedTime, watchedIntervals)) {
      console.log("Second already watched, not starting new interval");
      return;
    }

    // Start a new interval
    currentIntervalRef.current = {
      start: roundedTime,
      end: roundedTime,
    };

    // Add to the set of watched seconds for this interval
    watchedSecondsRef.current = new Set([roundedTime]);

    console.log("New interval started:", currentIntervalRef.current);

    // Add this interval to our state right away
    saveInterval(currentIntervalRef.current);
  };

  /**
   * Update the current watching interval
   * @param {Number} currentTime - Current video time in seconds
   */
  const updateWatchingInterval = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;

    const roundedTime = Math.floor(currentTime);
    currentTimeRef.current = roundedTime;

    if (!currentIntervalRef.current) {
      startWatchingInterval(currentTime);
      return;
    }

    // Skip if this second is already watched (either in saved intervals or current interval)
    if (
      isSecondWatched(roundedTime, watchedIntervals) ||
      watchedSecondsRef.current.has(roundedTime)
    ) {
      return;
    }

    // If this time is continuous with the current interval, extend it
    if (roundedTime === currentIntervalRef.current.end + 1) {
      currentIntervalRef.current.end = roundedTime;
      watchedSecondsRef.current.add(roundedTime);
      console.log("Extended interval:", currentIntervalRef.current);

      // Update our interval in state when it's extended
      saveInterval(currentIntervalRef.current);
    }
    // If there's a gap, send the current interval and start a new one
    else if (roundedTime > currentIntervalRef.current.end + 1) {
      const intervalToSave = { ...currentIntervalRef.current };
      console.log("Gap detected, saving interval:", intervalToSave);

      // Save the previous interval
      saveInterval(intervalToSave);

      // Start a new interval
      currentIntervalRef.current = {
        start: roundedTime,
        end: roundedTime,
      };
      watchedSecondsRef.current = new Set([roundedTime]);

      // Save the new interval right away
      saveInterval(currentIntervalRef.current);
    }
  };

  /**
   * Save an interval to the state and prepare for server update
   * @param {Object} interval - Interval to save
   */
  const saveInterval = (interval) => {
    if (!interval) return;

    console.log("Saving interval to state:", interval);

    setWatchedIntervals((prev) => {
      // Create a deep copy to avoid reference issues
      const newIntervals = prev.map((i) => ({ ...i }));

      // Check if this interval already exists (to avoid duplicates)
      const existingIndex = newIntervals.findIndex(
        (i) => i.start === interval.start && i.end === interval.end
      );

      if (existingIndex === -1) {
        newIntervals.push({ ...interval });
      }

      const merged = mergeIntervals(newIntervals);
      console.log("Merged intervals after save:", merged);

      // Calculate new progress percentage
      let newProgress = 0;
      if (totalDuration > 0) {
        newProgress = calculateProgress(merged, totalDuration);
        console.log(
          `New progress calculation: ${newProgress}% (${merged.length} intervals, duration: ${totalDuration}s)`
        );
      }

      // Ensure progress is a valid number
      const validProgress = isNaN(newProgress)
        ? isNaN(progressPercentage)
          ? 0
          : progressPercentage
        : newProgress;

      // Store the current progress for comparison
      const currentProgress = isNaN(progressPercentage)
        ? 0
        : progressPercentage;

      console.log(
        `Comparing progress: current=${currentProgress}, new=${validProgress}`
      );

      // Only update progress if the new value is higher (never decrease progress)
      if (
        validProgress > currentProgress ||
        validProgress > highestProgressRef.current
      ) {
        highestProgressRef.current = Math.max(
          validProgress,
          highestProgressRef.current
        );
        setProgressPercentage(validProgress);
        console.log(`Progress updated to ${validProgress}%`);
      } else {
        console.log(`Keeping current progress at ${currentProgress}%`);
      }

      // Save to local storage with the highest progress
      const finalProgress = Math.max(
        validProgress,
        currentProgress,
        highestProgressRef.current
      );

      saveLocalProgress({
        watchedIntervals: merged,
        progress: finalProgress,
        lastWatchedTime: currentTimeRef.current,
        totalDuration,
      });

      return merged;
    });
  };

  /**
   * Send intervals to the server
   * @param {Number} currentTime - Current time to save as last watched position
   */
  const syncWithServer = async (currentTime) => {
    try {
      // Prevent multiple syncs from running simultaneously
      if (isSyncingRef.current) {
        console.log("Sync already in progress, skipping");
        return;
      }

      isSyncingRef.current = true;

      // Use currentTime parameter or the latest stored time
      const timeToSave =
        currentTime !== undefined
          ? Math.floor(currentTime)
          : currentTimeRef.current;
      console.log("Syncing with server, current time:", timeToSave);

      // If there's an active interval, save it first
      if (currentIntervalRef.current && watchedSecondsRef.current.size > 0) {
        console.log(
          "Saving active interval before sync:",
          currentIntervalRef.current
        );
        saveInterval({ ...currentIntervalRef.current });

        // When pausing, keep the current interval data until next play
        // but mark it as inactive by clearing the watched seconds
        watchedSecondsRef.current = new Set();
      }

      // Nothing to update if no intervals and no duration
      if (watchedIntervals.length === 0 && !totalDuration) {
        console.log("No intervals or duration to sync");
        isSyncingRef.current = false;
        return;
      }

      // Store current local intervals and progress
      const currentProgress = isNaN(progressPercentage)
        ? 0
        : progressPercentage;
      const localData = {
        watchedIntervals: [...watchedIntervals],
        progress: currentProgress,
        lastWatchedTime: timeToSave || lastWatchedTime,
        totalDuration,
      };

      console.log("Syncing data with server:", localData);

      // Preserve the current progress percentage in case the server call fails
      const currentProgressBeforeSync = currentProgress;

      // Update data on the server
      const result = await updateProgress(userId, videoId, {
        newIntervals: watchedIntervals,
        lastWatchedTime: timeToSave || lastWatchedTime,
        totalDuration,
      });

      console.log("Server response:", result);

      // Only update local state if returned progress is higher
      const finalProgress = Math.max(
        result.progress,
        currentProgressBeforeSync,
        highestProgressRef.current
      );
      highestProgressRef.current = finalProgress;

      if (result.progress >= currentProgressBeforeSync) {
        console.log("Using server progress data");
        // Update state with server response
        setProgressPercentage(finalProgress);
        lastSavedIntervalsRef.current = [...result.watchedIntervals];
        setWatchedIntervals(result.watchedIntervals);
        setLastWatchedTime(result.lastWatchedTime);

        // Update local storage
        saveLocalProgress({
          watchedIntervals: result.watchedIntervals,
          progress: finalProgress,
          lastWatchedTime: result.lastWatchedTime,
          totalDuration,
        });
      } else {
        console.log("Server returned lower progress, keeping local progress");
        // If server progress is lower, update only the progress
        setProgressPercentage(finalProgress);

        // Save our current state to local storage
        saveLocalProgress({
          watchedIntervals: localData.watchedIntervals,
          progress: finalProgress,
          lastWatchedTime: localData.lastWatchedTime,
          totalDuration,
        });

        // Re-sync our higher progress back to server
        setTimeout(() => {
          updateProgress(userId, videoId, {
            newIntervals: localData.watchedIntervals,
            lastWatchedTime: localData.lastWatchedTime,
            totalDuration,
            forceProgress: finalProgress, // Tell server to use this progress
          }).catch((err) =>
            console.error("Error re-syncing higher progress:", err)
          );
        }, 1000);
      }
    } catch (err) {
      setError(err.message);
      console.error("Failed to sync progress with server:", err);

      // Even if server sync fails, update local storage
      // but maintain the current progress percentage
      const currentProgress = isNaN(progressPercentage)
        ? 0
        : progressPercentage;
      saveLocalProgress({
        watchedIntervals,
        progress: currentProgress,
        lastWatchedTime: currentTime || lastWatchedTime,
        totalDuration,
      });
    } finally {
      isSyncingRef.current = false;
    }
  };

  /**
   * Handle video time updates
   * @param {Number} currentTime - Current video time in seconds
   */
  const handleTimeUpdate = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;

    // Store the current progress before updating
    const beforeUpdateProgress = progressPercentage;

    // Update watching interval with the new time
    updateWatchingInterval(currentTime);

    // If progress was reset to zero or NaN for some reason, restore it
    // This is a safeguard against accidental resets
    setTimeout(() => {
      const afterUpdateProgress = progressPercentage;
      if (
        (isNaN(afterUpdateProgress) || afterUpdateProgress === 0) &&
        !isNaN(beforeUpdateProgress) &&
        beforeUpdateProgress > 0
      ) {
        console.log(
          `Progress was reset during update. Restoring ${beforeUpdateProgress}%`
        );
        setProgressPercentage(beforeUpdateProgress);
      }
    }, 50);
  };

  /**
   * Handle video duration change
   * @param {Number} duration - Video duration in seconds
   */
  const handleDurationChange = (duration) => {
    if (!duration || isNaN(duration)) return;
    const roundedDuration = Math.floor(duration);
    console.log("Video duration set:", roundedDuration);
    setTotalDuration(roundedDuration);
  };

  /**
   * Handle video play event
   * @param {Number} currentTime - Current video time in seconds
   */
  const handlePlay = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;
    console.log("Video started playing at:", currentTime);

    // Ensure we have a valid current time for calculations
    const roundedTime = Math.floor(currentTime);
    currentTimeRef.current = roundedTime;

    // Start a new interval when video plays
    startWatchingInterval(currentTime);

    // Set up periodic updates to the server
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    updateTimerRef.current = setInterval(() => {
      // Use the latest time from the ref instead of the captured value
      console.log("Timer update, current time:", currentTimeRef.current);

      // Make sure we don't lose progress during periodic updates
      if (currentIntervalRef.current) {
        saveInterval({ ...currentIntervalRef.current });
      }

      syncWithServer(currentTimeRef.current);
    }, 5000); // Update every 5 seconds
  };

  /**
   * Handle video pause event
   * @param {Number} currentTime - Current video time in seconds
   */
  const handlePause = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;
    console.log("Video paused at:", currentTime);

    // Ensure we have a valid current time for calculations
    currentTimeRef.current = Math.floor(currentTime);

    // First save current interval if it exists
    if (currentIntervalRef.current) {
      saveInterval({ ...currentIntervalRef.current });
    }

    // Store the current progress percentage before syncing
    const currentProgressValue = progressPercentage;
    console.log("Storing current progress before pause:", currentProgressValue);

    // Sync with server when video is paused
    syncWithServer(currentTime);

    // Ensure progress doesn't reset after sync by explicitly setting it back
    // This is a safeguard in case syncWithServer resets the value
    setTimeout(() => {
      console.log("Restoring progress after pause:", currentProgressValue);
      // Only restore if higher than current (to prevent overriding a better value)
      if (!isNaN(currentProgressValue) && currentProgressValue > 0) {
        const currentProgressAfterSync = progressPercentage;
        if (
          isNaN(currentProgressAfterSync) ||
          currentProgressValue > currentProgressAfterSync
        ) {
          setProgressPercentage(currentProgressValue);
        }
      }
    }, 100);

    // Clear the update timer
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  };

  return {
    loading,
    error,
    watchedIntervals,
    progressPercentage,
    lastWatchedTime,
    totalDuration,
    handleTimeUpdate,
    handleDurationChange,
    handlePlay,
    handlePause,
    syncWithServer,
  };
}
