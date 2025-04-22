import { useState, useEffect, useRef } from 'react';
import { getProgress, updateProgress } from '../utils/api';
import { mergeIntervals, calculateProgress, isSecondWatched } from '../utils/intervalUtils';

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
  
  // Fetch initial progress data
  useEffect(() => {
    async function fetchProgress() {
      try {
        setLoading(true);
        const data = await getProgress(userId, videoId);
        
        console.log('Fetched progress data:', data);
        
        setWatchedIntervals(data.watchedIntervals || []);
        setProgressPercentage(data.progress || 0);
        setLastWatchedTime(data.lastWatchedTime || 0);
        if (data.totalDuration) {
          setTotalDuration(data.totalDuration);
        }
        
        setError(null);
      } catch (err) {
        setError(err.message);
        console.error('Failed to fetch progress:', err);
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
    
    console.log('Starting interval at:', roundedTime);
    
    // Don't track if this second is already in watched intervals
    if (isSecondWatched(roundedTime, watchedIntervals)) {
      console.log('Second already watched, not starting new interval');
      return;
    }
    
    // Start a new interval
    currentIntervalRef.current = {
      start: roundedTime,
      end: roundedTime
    };
    
    // Add to the set of watched seconds for this interval
    watchedSecondsRef.current = new Set([roundedTime]);
    
    console.log('New interval started:', currentIntervalRef.current);
    
    // IMPORTANT: Actually add this interval to our state right away
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
    if (isSecondWatched(roundedTime, watchedIntervals) || watchedSecondsRef.current.has(roundedTime)) {
      return;
    }
    
    // If this time is continuous with the current interval, extend it
    if (roundedTime === currentIntervalRef.current.end + 1) {
      currentIntervalRef.current.end = roundedTime;
      watchedSecondsRef.current.add(roundedTime);
      console.log('Extended interval:', currentIntervalRef.current);
      
      // IMPORTANT: Update our interval in state when it's extended
      saveInterval(currentIntervalRef.current);
    } 
    // If there's a gap, send the current interval and start a new one
    else if (roundedTime > currentIntervalRef.current.end + 1) {
      const intervalToSave = { ...currentIntervalRef.current };
      console.log('Gap detected, saving interval:', intervalToSave);
      
      // Save the previous interval
      saveInterval(intervalToSave);
      
      // Start a new interval
      currentIntervalRef.current = {
        start: roundedTime,
        end: roundedTime
      };
      watchedSecondsRef.current = new Set([roundedTime]);
      
      // IMPORTANT: Save the new interval right away
      saveInterval(currentIntervalRef.current);
    }
  };
  
  /**
   * Save an interval to the state and prepare for server update
   * @param {Object} interval - Interval to save
   */
  const saveInterval = (interval) => {
    if (!interval) return;
    
    console.log('Saving interval to state:', interval);
    
    setWatchedIntervals(prev => {
      // IMPORTANT: Create a new array to prevent reference issues
      const newIntervals = [...prev];
      
      // Check if this interval already exists (to avoid duplicates)
      const existingIndex = newIntervals.findIndex(
        i => i.start === interval.start && i.end === interval.end
      );
      
      if (existingIndex === -1) {
        newIntervals.push({ ...interval });
      }
      
      const merged = mergeIntervals(newIntervals);
      console.log('Merged intervals after save:', merged);
      
      // Update progress percentage locally
      if (totalDuration > 0) {
        const newProgress = calculateProgress(merged, totalDuration);
        console.log(`Calculated progress: ${newProgress}% (${merged.length} intervals, duration: ${totalDuration}s)`);
        setProgressPercentage(newProgress);
      }
      
      return merged;
    });
  };
  
  /**
   * Send intervals to the server
   * @param {Number} currentTime - Current time to save as last watched position
   */
  const syncWithServer = async (currentTime) => {
    try {
      // Use currentTime parameter or the latest stored time
      const timeToSave = currentTime !== undefined ? Math.floor(currentTime) : currentTimeRef.current;
      console.log('Syncing with server, current time:', timeToSave);
      
      // If there's an active interval, save it first
      if (currentIntervalRef.current && watchedSecondsRef.current.size > 0) {
        console.log('Saving active interval before sync:', currentIntervalRef.current);
        saveInterval({ ...currentIntervalRef.current });
      }
      
      // Nothing to update if no intervals and no duration
      if (watchedIntervals.length === 0 && !totalDuration) {
        console.log('No intervals or duration to sync');
        return;
      }
      
      console.log('Syncing data with server:', {
        intervals: watchedIntervals,
        lastTime: timeToSave || lastWatchedTime,
        duration: totalDuration
      });
      
      // Update data on the server
      const result = await updateProgress(userId, videoId, {
        newIntervals: watchedIntervals,
        lastWatchedTime: timeToSave || lastWatchedTime,
        totalDuration
      });
      
      console.log('Server response:', result);
      
      // Update local state with server response
      setProgressPercentage(result.progress);
      setWatchedIntervals(result.watchedIntervals);
      setLastWatchedTime(result.lastWatchedTime);
      
    } catch (err) {
      setError(err.message);
      console.error('Failed to sync progress with server:', err);
    }
  };
  
  /**
   * Handle video time updates
   * @param {Number} currentTime - Current video time in seconds
   */
  const handleTimeUpdate = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;
    updateWatchingInterval(currentTime);
  };
  
  /**
   * Handle video duration change
   * @param {Number} duration - Video duration in seconds
   */
  const handleDurationChange = (duration) => {
    if (!duration || isNaN(duration)) return;
    const roundedDuration = Math.floor(duration);
    console.log('Video duration set:', roundedDuration);
    setTotalDuration(roundedDuration);
  };
  
  /**
   * Handle video play event
   * @param {Number} currentTime - Current video time in seconds
   */
  const handlePlay = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;
    console.log('Video started playing at:', currentTime);
    
    // Start a new interval when video plays
    startWatchingInterval(currentTime);
    
    // Set up periodic updates to the server
    if (updateTimerRef.current) {
      clearInterval(updateTimerRef.current);
    }
    
    updateTimerRef.current = setInterval(() => {
      // Use the latest time from the ref instead of the captured value
      console.log('Timer update, current time:', currentTimeRef.current);
      syncWithServer(currentTimeRef.current);
    }, 5000); // Update every 5 seconds
  };
  
  /**
   * Handle video pause event
   * @param {Number} currentTime - Current video time in seconds
   */
  const handlePause = (currentTime) => {
    if (!currentTime || isNaN(currentTime)) return;
    console.log('Video paused at:', currentTime);
    
    // Sync with server when video is paused
    syncWithServer(currentTime);
    
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
    syncWithServer
  };
} 