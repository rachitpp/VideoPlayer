import { useState, useEffect, useRef } from "react";
import { getProgress, updateProgress } from "../utils/api";
import {
  mergeIntervals,
  calculateProgress,
  isSecondWatched,
} from "../utils/intervalUtils";

// Quick helper for local storage keys
const getLocalStorageKey = (userId, videoId) =>
  `video_progress_${userId}_${videoId}`;

// Cleanup old localStorage entries so we don't bloat the browser
const cleanupLocalStorage = () => {
  try {
    const allKeys = Object.keys(localStorage);
    const videoProgressKeys = allKeys.filter((key) =>
      key.startsWith("video_progress_")
    );

    if (videoProgressKeys.length > 20) {
      const keysToRemove = videoProgressKeys
        .map((key) => {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            return { key, timestamp: data.timestamp || 0 };
          } catch {
            return { key, timestamp: 0 };
          }
        })
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(20)
        .map((item) => item.key);

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      console.log(`Cleaned up ${keysToRemove.length} old localStorage entries`);
    }
  } catch (err) {
    console.error("Error cleaning localStorage:", err);
  }
};

// Core hook for tracking what parts of a video someone's actually watched
export default function useVideoProgress(userId, videoId) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [watchedIntervals, setWatchedIntervals] = useState([]);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [lastWatchedTime, setLastWatchedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);

  const currentIntervalRef = useRef(null); // Current watching interval
  const watchedSecondsRef = useRef(new Set()); // For tracking unique seconds
  const updateTimerRef = useRef(null); // For server sync timer
  const currentTimeRef = useRef(0); // Last known position
  const lastSavedIntervalsRef = useRef([]); // Server-synced intervals
  const isSyncingRef = useRef(false); // Prevent parallel syncs
  const highestProgressRef = useRef(0); // Never decrease progress

  const loadLocalProgress = () => {
    try {
      const key = getLocalStorageKey(userId, videoId);
      const savedData = localStorage.getItem(key);

      if (savedData) {
        const data = JSON.parse(savedData);
        console.log("Found saved progress:", data);
        return data;
      }
    } catch (err) {
      console.error("Failed to load progress from local storage:", err);
    }
    return null;
  };

  const saveLocalProgress = (data) => {
    try {
      const key = getLocalStorageKey(userId, videoId);
      localStorage.setItem(
        key,
        JSON.stringify({
          ...data,
          timestamp: Date.now(),
        })
      );
      console.log("Saved progress locally");

      if (Math.random() < 0.1) {
        cleanupLocalStorage();
      }
    } catch (err) {
      console.error("Failed to save progress to local storage:", err);
    }
  };

  useEffect(() => {
    async function fetchProgress() {
      try {
        setLoading(true);

        const localData = loadLocalProgress();
        const serverData = await getProgress(userId, videoId);
        console.log("Got server data:", serverData);

        let finalData = serverData;

        if (localData && localData.progress > serverData.progress) {
          console.log("Local progress ahead of server, using that");
          finalData = {
            ...serverData,
            progress: localData.progress,
            watchedIntervals: mergeIntervals([
              ...(serverData.watchedIntervals || []),
              ...(localData.watchedIntervals || []),
            ]),
          };

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

        setWatchedIntervals(finalData.watchedIntervals || []);
        lastSavedIntervalsRef.current = [...(finalData.watchedIntervals || [])];
        setProgressPercentage(finalData.progress || 0);
        highestProgressRef.current = finalData.progress || 0;
        setLastWatchedTime(finalData.lastWatchedTime || 0);
        if (finalData.totalDuration) {
          setTotalDuration(finalData.totalDuration);
        }

        saveLocalProgress(finalData);

        setError(null);
      } catch (err) {
        setError(err.message);
        console.error("Server fetch failed:", err);

        const localData = loadLocalProgress();
        if (localData) {
          console.log("Using local data since server's not available");
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

    return () => {
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
    };
  }, [userId, videoId]);

  const startWatchingInterval = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;

    const roundedTime = Math.floor(currentTime);
    currentTimeRef.current = roundedTime;

    console.log("Starting interval at:", roundedTime);

    if (isSecondWatched(roundedTime, watchedIntervals)) {
      console.log("Second already watched, not starting new interval");
      return;
    }

    currentIntervalRef.current = {
      start: roundedTime,
      end: roundedTime,
    };

    watchedSecondsRef.current = new Set([roundedTime]);

    console.log("New interval started:", currentIntervalRef.current);

    saveInterval(currentIntervalRef.current);
  };

  const updateWatchingInterval = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;

    const roundedTime = Math.floor(currentTime);
    currentTimeRef.current = roundedTime;

    if (!currentIntervalRef.current) {
      startWatchingInterval(currentTime);
      return;
    }

    if (
      isSecondWatched(roundedTime, watchedIntervals) ||
      watchedSecondsRef.current.has(roundedTime)
    ) {
      return;
    }

    if (roundedTime === currentIntervalRef.current.end + 1) {
      currentIntervalRef.current.end = roundedTime;
      watchedSecondsRef.current.add(roundedTime);

      if (roundedTime % 3 === 0) {
        console.log("Extended interval:", currentIntervalRef.current);
        saveInterval(currentIntervalRef.current);
      }
    } else if (roundedTime > currentIntervalRef.current.end + 1) {
      const intervalToSave = { ...currentIntervalRef.current };
      console.log("Gap detected, saving interval:", intervalToSave);

      saveInterval(intervalToSave);

      currentIntervalRef.current = {
        start: roundedTime,
        end: roundedTime,
      };
      watchedSecondsRef.current = new Set([roundedTime]);

      saveInterval(currentIntervalRef.current);
    }
  };

  // Debounced version to reduce localStorage writes
  const debouncedSaveLocalProgress = (() => {
    let timeoutId = null;
    return (data) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        try {
          const key = getLocalStorageKey(userId, videoId);
          localStorage.setItem(
            key,
            JSON.stringify({
              ...data,
              timestamp: Date.now(),
            })
          );
          console.log("Saved progress to local storage");

          if (Math.random() < 0.1) {
            cleanupLocalStorage();
          }
        } catch (err) {
          console.error("Failed to save progress to local storage:", err);
        }
        timeoutId = null;
      }, 500);
    };
  })();

  const saveInterval = (interval) => {
    if (!interval) return;

    console.log("Saving interval to state:", interval);

    setWatchedIntervals((prev) => {
      const newIntervals = prev.map((i) => ({ ...i }));

      const existingIndex = newIntervals.findIndex(
        (i) => i.start === interval.start && i.end === interval.end
      );

      if (existingIndex === -1) {
        newIntervals.push({ ...interval });
      }

      const merged = mergeIntervals(newIntervals);
      console.log("Merged intervals after save:", merged);

      let newProgress = 0;
      if (totalDuration > 0) {
        newProgress = calculateProgress(merged, totalDuration);
        console.log(
          `New progress calculation: ${newProgress}% (${merged.length} intervals, duration: ${totalDuration}s)`
        );
      }

      const validProgress = isNaN(newProgress)
        ? isNaN(progressPercentage)
          ? 0
          : progressPercentage
        : newProgress;

      const currentProgress = isNaN(progressPercentage)
        ? 0
        : progressPercentage;

      console.log(
        `Comparing progress: current=${currentProgress}, new=${validProgress}`
      );

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

      const finalProgress = Math.max(
        validProgress,
        currentProgress,
        highestProgressRef.current
      );

      debouncedSaveLocalProgress({
        watchedIntervals: merged,
        progress: finalProgress,
        lastWatchedTime: currentTimeRef.current,
        totalDuration,
      });

      return merged;
    });
  };

  const syncWithServer = async (currentTime) => {
    try {
      if (isSyncingRef.current) {
        console.log("Sync already in progress, skipping");
        return;
      }

      isSyncingRef.current = true;

      const timeToSave =
        currentTime !== undefined
          ? Math.floor(currentTime)
          : currentTimeRef.current;
      console.log("Syncing with server, current time:", timeToSave);

      if (currentIntervalRef.current && watchedSecondsRef.current.size > 0) {
        console.log(
          "Saving active interval before sync:",
          currentIntervalRef.current
        );
        saveInterval({ ...currentIntervalRef.current });

        watchedSecondsRef.current = new Set();
      }

      if (watchedIntervals.length === 0 && !totalDuration) {
        console.log("No intervals or duration to sync");
        isSyncingRef.current = false;
        return;
      }

      const currentProgress = isNaN(progressPercentage)
        ? 0
        : progressPercentage;
      const localData = {
        watchedIntervals: [...watchedIntervals],
        progress: currentProgress,
        lastWatchedTime: timeToSave || lastWatchedTime,
        totalDuration,
      };

      const syncStartTime = Date.now();
      const currentProgressBeforeSync = currentProgress;

      const newIntervalsToSync = watchedIntervals.filter(
        (interval) =>
          !lastSavedIntervalsRef.current.some(
            (saved) =>
              saved.start === interval.start && saved.end === interval.end
          )
      );

      console.log(
        `Syncing ${newIntervalsToSync.length} new intervals with server`
      );

      const result = await updateProgress(userId, videoId, {
        newIntervals:
          newIntervalsToSync.length > 0 ? newIntervalsToSync : watchedIntervals,
        lastWatchedTime: timeToSave || lastWatchedTime,
        totalDuration,
      });

      console.log("Server response:", result);

      const finalProgress = Math.max(
        result.progress,
        currentProgressBeforeSync,
        highestProgressRef.current
      );
      highestProgressRef.current = finalProgress;

      if (result.progress >= currentProgressBeforeSync) {
        console.log("Using server progress data");
        setProgressPercentage(finalProgress);
        lastSavedIntervalsRef.current = [...result.watchedIntervals];
        setWatchedIntervals(result.watchedIntervals);
        setLastWatchedTime(result.lastWatchedTime);

        debouncedSaveLocalProgress({
          watchedIntervals: result.watchedIntervals,
          progress: finalProgress,
          lastWatchedTime: result.lastWatchedTime,
          totalDuration,
        });
      } else {
        console.log("Server returned lower progress, keeping local progress");
        setProgressPercentage(finalProgress);

        debouncedSaveLocalProgress({
          watchedIntervals: localData.watchedIntervals,
          progress: finalProgress,
          lastWatchedTime: localData.lastWatchedTime,
          totalDuration,
        });

        if (finalProgress - result.progress > 1) {
          setTimeout(() => {
            updateProgress(userId, videoId, {
              newIntervals: localData.watchedIntervals,
              lastWatchedTime: localData.lastWatchedTime,
              totalDuration,
              forceProgress: finalProgress,
            }).catch((err) =>
              console.error("Error re-syncing higher progress:", err)
            );
          }, 3000);
        }
      }

      console.log(`Sync completed in ${Date.now() - syncStartTime}ms`);
    } catch (err) {
      setError(err.message);
      console.error("Failed to sync progress with server:", err);

      const currentProgress = isNaN(progressPercentage)
        ? 0
        : progressPercentage;
      debouncedSaveLocalProgress({
        watchedIntervals,
        progress: currentProgress,
        lastWatchedTime: currentTime || lastWatchedTime,
        totalDuration,
      });
    } finally {
      isSyncingRef.current = false;
    }
  };

  const handleTimeUpdate = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;

    // Throttle time updates to reduce main thread load
    const now = Date.now();
    if (now - (handleTimeUpdate.lastUpdate || 0) < 200) {
      return;
    }
    handleTimeUpdate.lastUpdate = now;

    const beforeUpdateProgress = progressPercentage;

    const lastKnownTime = currentTimeRef.current;
    const timeDiff = Math.abs(currentTime - lastKnownTime);

    if (timeDiff > 2 && lastKnownTime > 0) {
      console.log(`Seek detected: ${lastKnownTime} -> ${currentTime}`);

      if (currentIntervalRef.current) {
        saveInterval({ ...currentIntervalRef.current });
        currentIntervalRef.current = null;
      }

      startWatchingInterval(currentTime);
    } else {
      updateWatchingInterval(currentTime);
    }

    if (
      (isNaN(progressPercentage) || progressPercentage === 0) &&
      !isNaN(beforeUpdateProgress) &&
      beforeUpdateProgress > 0
    ) {
      setTimeout(() => {
        console.log(
          `Progress was reset during update. Restoring ${beforeUpdateProgress}%`
        );
        setProgressPercentage(beforeUpdateProgress);
      }, 0);
    }
  };

  const handleDurationChange = (duration) => {
    if (!duration || isNaN(duration)) return;
    const roundedDuration = Math.floor(duration);
    console.log("Video duration set:", roundedDuration);
    setTotalDuration(roundedDuration);
  };

  const handlePlay = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;
    console.log("Video started playing at:", currentTime);

    const roundedTime = Math.floor(currentTime);
    currentTimeRef.current = roundedTime;

    startWatchingInterval(currentTime);

    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }

    updateTimerRef.current = setInterval(() => {
      console.log("Timer update, current time:", currentTimeRef.current);

      if (currentIntervalRef.current) {
        saveInterval({ ...currentIntervalRef.current });
      }

      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        window.requestIdleCallback(
          () => syncWithServer(currentTimeRef.current),
          { timeout: 2000 }
        );
      } else {
        setTimeout(() => syncWithServer(currentTimeRef.current), 0);
      }
    }, 10000);
  };

  const handlePause = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;
    console.log("Video paused at:", currentTime);

    currentTimeRef.current = Math.floor(currentTime);

    if (currentIntervalRef.current) {
      saveInterval({ ...currentIntervalRef.current });
    }

    const currentProgressValue = progressPercentage;
    console.log("Storing current progress before pause:", currentProgressValue);

    syncWithServer(currentTime);

    setTimeout(() => {
      console.log("Restoring progress after pause:", currentProgressValue);
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
