/**
 * Merges overlapping intervals
 * @param {Array} intervals - Array of interval objects with start and end properties
 * @returns {Array} - Merged non-overlapping intervals
 */
export function mergeIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];

  console.log("Merging intervals input:", JSON.stringify(intervals));

  // Filter out garbage data - defensive coding ftw
  const validIntervals = intervals.filter(
    (interval) =>
      interval &&
      typeof interval === "object" &&
      interval.start !== undefined &&
      interval.end !== undefined &&
      !isNaN(interval.start) &&
      !isNaN(interval.end) &&
      interval.start <= interval.end
  );

  if (validIntervals.length === 0) return [];

  // Make a copy and sort by start time
  const sortedIntervals = validIntervals
    .map((interval) => ({ start: interval.start, end: interval.end }))
    .sort((a, b) => a.start - b.start);

  const result = [sortedIntervals[0]];

  for (let i = 1; i < sortedIntervals.length; i++) {
    const currentInterval = sortedIntervals[i];
    const lastMergedInterval = result[result.length - 1];

    // Add 1 second buffer to join nearly-adjacent intervals
    if (currentInterval.start <= lastMergedInterval.end + 1) {
      lastMergedInterval.end = Math.max(
        lastMergedInterval.end,
        currentInterval.end
      );
    } else {
      // No overlap, add as separate interval
      result.push(currentInterval);
    }
  }

  console.log("Merging intervals output:", JSON.stringify(result));
  return result;
}

/**
 * Calculates total unique seconds watched from intervals
 * @param {Array} intervals - Array of merged interval objects
 * @returns {Number} - Total seconds watched
 */
export function calculateWatchedSeconds(intervals) {
  if (!intervals || intervals.length === 0) return 0;

  const totalSeconds = intervals.reduce((total, interval) => {
    // Skip invalid intervals
    if (
      !interval ||
      typeof interval !== "object" ||
      interval.start === undefined ||
      interval.end === undefined ||
      isNaN(interval.start) ||
      isNaN(interval.end) ||
      interval.start > interval.end
    ) {
      return total;
    }

    const seconds = Math.max(0, interval.end - interval.start + 1);
    return total + seconds;
  }, 0);

  console.log(`Total watched: ${totalSeconds} seconds`);
  return totalSeconds;
}

/**
 * Calculates progress percentage
 * @param {Array} intervals - Array of interval objects
 * @param {Number} totalDuration - Total video duration in seconds
 * @returns {Number} - Progress percentage (0-100)
 */
export function calculateProgress(intervals, totalDuration) {
  if (!totalDuration || totalDuration <= 0 || isNaN(totalDuration)) return 0;

  const watchedSeconds = calculateWatchedSeconds(intervals);

  if (watchedSeconds <= 0 || isNaN(watchedSeconds)) return 0;

  const progressPercentage = (watchedSeconds / totalDuration) * 100;

  if (isNaN(progressPercentage)) return 0;

  // Cap at 100% - can't watch more than the full video
  const result = Math.min(Math.round(progressPercentage * 100) / 100, 100);

  console.log(`Progress: ${watchedSeconds}s / ${totalDuration}s = ${result}%`);
  return result;
}

/**
 * Checks if a second is within any of the intervals
 * @param {Number} second - The second to check
 * @param {Array} intervals - Array of interval objects
 * @returns {Boolean} - Whether the second is in any interval
 */
export function isSecondWatched(second, intervals) {
  if (
    !intervals ||
    intervals.length === 0 ||
    second === undefined ||
    isNaN(second)
  )
    return false;

  for (const interval of intervals) {
    // Skip bad data
    if (
      !interval ||
      typeof interval !== "object" ||
      interval.start === undefined ||
      interval.end === undefined ||
      isNaN(interval.start) ||
      isNaN(interval.end)
    ) {
      continue;
    }

    if (second >= interval.start && second <= interval.end) {
      return true;
    }
  }
  return false;
}
