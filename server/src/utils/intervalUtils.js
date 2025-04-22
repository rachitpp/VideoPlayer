/**
 * Merges overlapping intervals
 * @param {Array} intervals - Array of interval objects with start and end properties
 * @returns {Array} - Merged non-overlapping intervals
 */
function mergeIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];
  
  console.log('Merging intervals input:', intervals);
  
  // Sort intervals by start time
  const sortedIntervals = [...intervals].sort((a, b) => a.start - b.start);
  
  const result = [sortedIntervals[0]];
  
  for (let i = 1; i < sortedIntervals.length; i++) {
    const currentInterval = sortedIntervals[i];
    const lastMergedInterval = result[result.length - 1];
    
    // If current interval overlaps with the last merged interval, merge them
    if (currentInterval.start <= lastMergedInterval.end + 1) {
      lastMergedInterval.end = Math.max(lastMergedInterval.end, currentInterval.end);
    } else {
      // Add the current interval to the result if it doesn't overlap
      result.push(currentInterval);
    }
  }
  
  console.log('Merging intervals output:', result);
  return result;
}

/**
 * Calculates total unique seconds watched from intervals
 * @param {Array} intervals - Array of merged interval objects
 * @returns {Number} - Total seconds watched
 */
function calculateWatchedSeconds(intervals) {
  if (!intervals || intervals.length === 0) return 0;
  
  const totalSeconds = intervals.reduce((total, interval) => {
    const seconds = interval.end - interval.start + 1;
    return total + seconds;
  }, 0);
  
  console.log(`Calculated total watched seconds: ${totalSeconds}`);
  return totalSeconds;
}

/**
 * Calculates progress percentage
 * @param {Array} intervals - Array of interval objects
 * @param {Number} totalDuration - Total video duration in seconds
 * @returns {Number} - Progress percentage (0-100)
 */
function calculateProgress(intervals, totalDuration) {
  if (!totalDuration || totalDuration <= 0) return 0;
  
  const watchedSeconds = calculateWatchedSeconds(intervals);
  
  // Handle invalid values
  if (watchedSeconds <= 0) return 0;
  
  const progressPercentage = (watchedSeconds / totalDuration) * 100;
  
  // Round to 2 decimal places and ensure it doesn't exceed 100%
  const result = Math.min(Math.round(progressPercentage * 100) / 100, 100);
  
  console.log(`Progress calculation: ${watchedSeconds}s / ${totalDuration}s = ${result}%`);
  return result;
}

module.exports = {
  mergeIntervals,
  calculateWatchedSeconds,
  calculateProgress
}; 