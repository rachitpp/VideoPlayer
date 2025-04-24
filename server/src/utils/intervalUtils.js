// Combines overlapping time intervals into continuous segments
function mergeIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];

  console.log("Merging intervals input:", intervals);

  // Sort by start time to make merging possible
  const sortedIntervals = [...intervals].sort((a, b) => a.start - b.start);

  const result = [sortedIntervals[0]];

  for (let i = 1; i < sortedIntervals.length; i++) {
    const currentInterval = sortedIntervals[i];
    const lastMergedInterval = result[result.length - 1];

    // Join intervals that overlap or are adjacent (within 1 second)
    if (currentInterval.start <= lastMergedInterval.end + 1) {
      lastMergedInterval.end = Math.max(
        lastMergedInterval.end,
        currentInterval.end
      );
    } else {
      // Add as separate interval if there's a gap
      result.push(currentInterval);
    }
  }

  console.log("Merging intervals output:", result);
  return result;
}

// Calculates total unique seconds across all intervals
function calculateWatchedSeconds(intervals) {
  if (!intervals || intervals.length === 0) return 0;

  const totalSeconds = intervals.reduce((total, interval) => {
    const seconds = interval.end - interval.start + 1;
    return total + seconds;
  }, 0);

  console.log(`Calculated total watched seconds: ${totalSeconds}`);
  return totalSeconds;
}

// Calculates what percentage of the video has been watched
function calculateProgress(intervals, totalDuration) {
  if (!totalDuration || totalDuration <= 0) return 0;

  const watchedSeconds = calculateWatchedSeconds(intervals);

  // Handle invalid inputs
  if (watchedSeconds <= 0) return 0;

  const progressPercentage = (watchedSeconds / totalDuration) * 100;

  // Cap at 100% and round to 2 decimal places
  const result = Math.min(Math.round(progressPercentage * 100) / 100, 100);

  console.log(`Progress: ${watchedSeconds}s / ${totalDuration}s = ${result}%`);
  return result;
}

module.exports = {
  mergeIntervals,
  calculateWatchedSeconds,
  calculateProgress,
};
