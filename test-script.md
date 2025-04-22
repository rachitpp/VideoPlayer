# Test Script for Lecture Video Progress Tracker

This document provides a step-by-step testing procedure to verify that the application works correctly.

## Prerequisites

1. MongoDB is installed and running locally
2. Both server and client applications are installed and running:
   - Server running on port 5000
   - Client running on port 5173 (or another port provided by Vite)

## Testing Procedure

### 1. Initial Loading

1. Open the application in your browser
2. Verify that:
   - The video player loads without errors
   - The progress bar shows 0% (if this is your first time)
   - The video shows a still frame of the video

### 2. Basic Playback

1. Click the Play button in the video controls
2. Watch for at least 10 seconds
3. Verify that:
   - The video plays smoothly
   - The current time indicator updates
   - The progress percentage stays at 0% until the first server sync (5 seconds)

### 3. Progress Tracking

1. Continue watching for at least 30 seconds
2. Pause the video
3. Verify that:
   - The progress percentage has increased
   - The progress bar fills according to the percentage

### 4. Resume Playback

1. Reload the page
2. Verify that:
   - The video position is set to where you left off
   - The progress percentage shows your previous progress

### 5. Skip Testing

1. Play the video again
2. Skip ahead by clicking on the progress bar or using video controls
3. Play for another 10 seconds
4. Verify that:
   - Only the actually watched segments contribute to progress
   - Skipped segments do not count toward progress

### 6. Rewatching Testing

1. Go back to a part you've already watched
2. Watch that part again for at least 10 seconds
3. Verify that:
   - The progress percentage does not increase (or only increases slightly if you watch a few seconds that weren't counted before)
   - The system does not double-count the already watched segments

### 7. Browser Refresh Testing

1. Close the browser tab
2. Reopen the application
3. Verify that:
   - Your progress is persisted
   - The video resumes from where you left off

## Expected Results

- Progress tracking should be accurate to within 1-2%
- Only unique seconds watched should contribute to progress
- Progress should persist between sessions
- The video should always resume from the last watched position

## Troubleshooting

If you encounter issues:

1. Check the browser console for JavaScript errors
2. Verify that MongoDB is running and accessible
3. Check the server logs for any backend errors
4. Verify that the client can connect to the backend (no CORS issues) 