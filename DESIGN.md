# 🏗️ Design Documentation

This document outlines the architecture, design decisions, and implementation details of the Lecture Video Progress Tracker application.

## 🎯 Design Goals

1. **Accurate Progress Tracking**: Create a system that tracks actual video consumption, not just playback position
2. **Seamless User Experience**: Ensure users can resume where they left off across sessions
3. **Efficient Data Management**: Minimize network usage while maintaining data integrity
4. **Clean Separation of Concerns**: Keep business logic separate from UI components
5. **Scalable Architecture**: Enable future feature additions without major refactoring

## 🏛️ System Architecture

The application follows a standard MERN stack architecture with clear separation between frontend and backend:

### Frontend Architecture

The React frontend follows a component-based architecture with custom hooks for business logic:

```
client/
├── components/         # UI components with minimal business logic
├── hooks/              # Custom hooks containing core business logic
├── utils/              # Helper functions and utilities
└── assets/             # Static resources
```

#### Key Components

1. **HomePage**: Landing page that displays available videos
2. **VideoPage**: Container component that manages routing and video selection
3. **VideoPlayer**: Core video player component with progress UI

#### Key Hooks

1. **useVideoProgress**: The most critical hook that manages:
   - Interval tracking logic
   - Server synchronization
   - Progress calculation
   - Playback state management

### Backend Architecture

The Node.js/Express backend follows a standard MVC-like pattern:

```
server/
├── controllers/        # Business logic and request handling
├── models/             # MongoDB schema definitions
├── routes/             # API endpoint definitions
└── utils/              # Helper functions
```

## 🧩 Core Technical Concepts

### Interval-Based Progress Tracking

Instead of tracking a single "last position" like most video players, our system:

1. Records **intervals** of time that users actually watch
2. Merges overlapping intervals to avoid double-counting
3. Calculates progress as the percentage of unique seconds watched

Example:

```javascript
// If a user watches:
// - 0:00 to 1:30
// - 1:00 to 2:30
// - 5:00 to 6:00

// The merged intervals would be:
// - 0:00 to 2:30
// - 5:00 to 6:00

// Total unique seconds watched: (2:30 - 0:00) + (6:00 - 5:00) = 150 + 60 = 210 seconds
```

#### Detailed Implementation

Our interval tracking system uses the HTML5 Video API events to monitor user interaction:

```javascript
// Pseudocode for tracking intervals
function startTracking(videoElement) {
  let currentInterval = null;

  videoElement.addEventListener("play", () => {
    // Start a new interval when video plays
    currentInterval = {
      start: Math.floor(videoElement.currentTime),
      end: Math.floor(videoElement.currentTime),
    };
  });

  videoElement.addEventListener("timeupdate", () => {
    // Extend current interval as time progresses
    if (currentInterval && !videoElement.paused) {
      currentInterval.end = Math.floor(videoElement.currentTime);
    }
  });

  videoElement.addEventListener("pause", () => {
    // Complete the interval and add to our list
    if (currentInterval) {
      addInterval(currentInterval);
      currentInterval = null;
    }
  });

  videoElement.addEventListener("seeking", () => {
    // Handle user jumping to a different position
    // Complete current interval
    if (currentInterval) {
      addInterval(currentInterval);
      currentInterval = null;
    }
  });
}
```

### Interval Merging Algorithm

Our merging algorithm is a variant of the classic "merge overlapping intervals" algorithm with optimizations for video progress tracking:

```javascript
function mergeWatchedIntervals(intervals) {
  // Edge case: empty or single interval
  if (!intervals.length) return [];
  if (intervals.length === 1) return [...intervals];

  // Sort intervals by start time
  const sortedIntervals = [...intervals].sort((a, b) => a.start - b.start);

  const merged = [];
  let currentMerged = { ...sortedIntervals[0] };

  for (let i = 1; i < sortedIntervals.length; i++) {
    const current = sortedIntervals[i];

    // If current interval overlaps with merged interval
    if (current.start <= currentMerged.end + 1) {
      // Note: +1 second buffer for continuity
      // Extend the end time if needed
      currentMerged.end = Math.max(currentMerged.end, current.end);
    } else {
      // No overlap, push merged interval and start a new one
      merged.push(currentMerged);
      currentMerged = { ...current };
    }
  }

  // Don't forget to add the last merged interval
  merged.push(currentMerged);

  return merged;
}
```

This algorithm has a time complexity of O(n log n) due to the sorting operation, and a space complexity of O(n) for storing the merged intervals.

### Progress Calculation

The progress is calculated by determining the percentage of unique seconds watched relative to the total video duration:

```javascript
function calculateProgress(mergedIntervals, totalDuration) {
  // Sum up the duration of all merged intervals
  const uniqueSecondsWatched = mergedIntervals.reduce(
    (total, interval) => total + (interval.end - interval.start),
    0
  );

  // Calculate percentage, ensuring we don't exceed 100%
  const percentage = Math.min(
    (uniqueSecondsWatched / totalDuration) * 100,
    100
  );

  return percentage;
}
```

### Optimized Synchronization

To minimize network usage while ensuring data integrity:

1. Changes are batched and sent periodically rather than on every second
2. Full synchronization occurs during critical events (pause, end of video)
3. Debounced updates prevent excessive server calls during rapid interactions

### Resuming Playback

The system intelligently resumes playback:

1. On initial load, fetch the last watched position from the server
2. Set the video player's `currentTime` to this position
3. Maintain the last position during the session for quick recovery

## 💡 Key Design Decisions

### 1. Client-Side Interval Processing

**Decision**: Process and merge intervals on the client side before sending to the server.

**Rationale**:

- Reduces server load
- Minimizes data transfer size
- Enables immediate UI feedback without waiting for server responses

### 2. Custom Hook Pattern

**Decision**: Extract all progress tracking logic into a dedicated hook.

**Rationale**:

- Separates business logic from UI components
- Makes testing easier
- Enables reuse across different video player implementations

### 3. Smart Merge Algorithm

**Decision**: Implement an efficient algorithm to merge overlapping time intervals.

**Rationale**:

- Accurately represents uniquely watched content
- Prevents progress inflation from rewatching the same content
- Provides more meaningful learning analytics

### 4. Hybrid State Management

**Decision**: Use local React state for UI concerns and API calls for persistence.

**Rationale**:

- Simplifies architecture (no Redux needed)
- Keeps components focused on their responsibilities
- Maintains clear data flow within the application

## 🔄 Data Flow

1. **Video Playback Events** → Captured by `VideoPlayer` component
2. **Events** → Processed by `useVideoProgress` hook
3. **Processed Intervals** → Stored in local state
4. **Batched Updates** → Sent to backend API
5. **Persisted Data** → Retrieved on page load

## ⚙️ Implementation Challenges and Solutions

### 1. Memory Management for Long Videos

**Challenge**: For lengthy videos (1+ hours), storing second-by-second intervals could consume excessive memory, especially on mobile devices.

**Solution**:

- Implemented a compression algorithm that merges adjacent intervals during runtime
- Set up a cleanup mechanism that runs after sync to minimize memory footprint
- Introduced a maximum interval count threshold with intelligent pruning

```javascript
function compressIntervals(intervals, threshold = 100) {
  // If below threshold, no compression needed
  if (intervals.length < threshold) return intervals;

  // Sort and run a more aggressive merge to reduce count
  // Consider intervals within 5 seconds as continuous
  return intervals
    .sort((a, b) => a.start - b.start)
    .reduce((result, current) => {
      if (!result.length) return [current];

      const last = result[result.length - 1];
      if (current.start <= last.end + 5) {
        last.end = Math.max(last.end, current.end);
      } else {
        result.push(current);
      }
      return result;
    }, []);
}
```

### 2. Handling User Interruptions

**Challenge**: Users frequently interrupt playback (pause, seek, tab switching) which created fragmented intervals and complicated tracking.

**Solution**:

- Implemented a buffer system that can reconcile nearby intervals
- Added browser tab visibility detection to properly handle background tabs
- Built a state machine to handle various transition states correctly

```javascript
// Tab visibility handling
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // User switched away, complete current interval
    pauseTracking();
  } else {
    // User returned, ready to start new interval when play resumes
    prepareForResuming();
  }
});
```

### 3. Network Resilience

**Challenge**: Unreliable network conditions could cause progress loss if syncs failed to complete.

**Solution**:

- Implemented local storage fallback that persists intervals between sessions
- Added exponential backoff retry logic for sync failures
- Created a sync queue that ensures operations occur in the correct order

```javascript
async function syncWithRetry(data, maxRetries = 3) {
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const response = await fetch("/api/progress", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) return await response.json();

      // Server error, retry
      retries++;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retries)));
    } catch (error) {
      // Network error, retry
      retries++;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retries)));
    }
  }

  // If all retries fail, store in local fallback
  saveToLocalStorage(data);
  return null;
}
```

### 4. Handling Edge Cases

**Challenge**: Special cases like short video segments, rapid seeking, or very long watching sessions created unexpected behavior.

**Solution**:

- Created comprehensive test cases with edge-case scenarios
- Implemented boundary checks and validation for all time inputs
- Added safeguards to prevent impossible interval states

```javascript
function validateInterval(interval, videoDuration) {
  // Ensure interval boundaries make sense
  if (interval.start < 0) interval.start = 0;
  if (interval.end > videoDuration) interval.end = videoDuration;

  // Discard invalid intervals
  if (interval.start >= interval.end) return null;

  // Ensure minimum interval length (e.g., at least 1 second)
  if (interval.end - interval.start < 1) return null;

  return interval;
}
```

## 🚀 Future Enhancements

1. **Offline Support**: Implement IndexedDB for offline progress tracking
2. **Multiple User Profiles**: Add support for different user profiles
3. **Analytics Dashboard**: Create visualizations of watching patterns
4. **Content Recommendations**: Suggest videos based on watching history
5. **Mobile Applications**: Expand to React Native for mobile support

## 🧪 Performance Considerations

1. **Interval Merging Efficiency**: The merge algorithm has O(n log n) complexity due to sorting
2. **Memory Usage**: For very long videos, the intervals array could grow large
3. **Network Optimization**: Synchronization is throttled to prevent excessive API calls
4. **Video Buffering**: The player implements preloading strategies for smoother playback

## 🛡️ Security Considerations

1. **User Authentication**: JWT-based auth protects user-specific progress data
2. **Input Validation**: All API endpoints validate input data before processing
3. **Cross-Origin Resource Sharing**: Proper CORS settings to prevent unauthorized access
4. **Content Security**: Video URLs can be signed to prevent unauthorized access
