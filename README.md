# 🎬 Lecture Video Progress Tracker

<div align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version 1.0.0" />
  <img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT" />
  <img src="https://img.shields.io/badge/node-%3E=14.0.0-brightgreen.svg" alt="Node.js Version" />
  <img src="https://img.shields.io/badge/MongoDB-4.4+-00684A.svg" alt="MongoDB Version" />
</div>

<p align="center">
  A modern MERN stack application for tracking video lecture progress with precision second-by-second tracking.
</p>

## ✨ Features

- **🎯 Precise Progress Tracking**: Records only genuinely watched content using second-by-second interval tracking
- **💾 Seamless Persistence**: Maintains progress across sessions with automatic syncing
- **🧠 Smart Interval Merging**: Accurately calculates progress by joining overlapping watched segments
- **⏱️ Auto-Resume**: Continues playback from the exact position where you left off
- **🔄 Real-time Sync**: Regularly syncs progress data with the server
- **🎨 Clean UI/UX**: Intuitive, responsive interface designed for distraction-free learning

## 🔧 Tech Stack

<table align="center">
  <tr>
    <td align="center"><strong>Frontend</strong></td>
    <td align="center"><strong>Backend</strong></td>
  </tr>
  <tr>
    <td>
      • React (Vite)<br/>
      • JavaScript/JSX<br/>
      • CSS (vanilla)<br/>
      • HTML5 Video API
    </td>
    <td>
      • Node.js<br/>
      • Express.js<br/>
      • MongoDB<br/>
      • JSON Web Tokens
    </td>
  </tr>
</table>

## 🚀 Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB installed and running locally (or MongoDB Atlas account)
- npm or yarn package manager

### Frontend Setup

1. Navigate to the client directory:

   ```bash
   cd client
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

### Backend Setup

1. Navigate to the server directory:

   ```bash
   cd server
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:

   ```
   MONGODB_URI=your_mongodb_connection_string
   PORT=5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
.
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── HomePage    # Landing page with video list
│   │   │   ├── VideoPage   # Video player container
│   │   │   └── VideoPlayer # Core video player component
│   │   ├── hooks/          # Custom React hooks
│   │   │   └── useVideoProgress # Handles progress tracking logic
│   │   ├── utils/          # Utility functions
│   │   └── assets/         # Static resources
│   └── public/             # Public files
│
└── server/                 # Backend Express application
    ├── src/
    │   ├── controllers/    # API controllers
    │   ├── models/         # MongoDB schemas
    │   ├── routes/         # API routes
    │   └── utils/          # Helper functions
    └── .env                # Environment variables
```

## 🔍 How It Works

The application uses a unique approach to track video watching progress:

1. As you watch a video, the app tracks "intervals" of time you've watched
2. These intervals are smartly merged when they overlap
3. Progress is calculated based on unique seconds watched, not just video position
4. Data is periodically synced with the server to maintain progress across devices

This ensures that your progress reflects actual content consumed, not just video scrubbing or skipping.

## 📊 Technical Implementation

### Interval Tracking Approach

Our interval-based tracking system works by:

1. **Capturing Active Viewing**: We track actual watching by monitoring the video's play and pause events
2. **Creating Intervals**: When you start watching at timestamp A and continue to B, we create an interval [A,B]
3. **Handling User Behavior**: If you skip around, we capture these as separate intervals
4. **Sampling Rate**: We sample at approximately 1-second intervals during playback to balance accuracy and performance

### Interval Merging Algorithm

We implemented a merge algorithm that:

1. Sorts all intervals by start time
2. Iteratively merges overlapping intervals
3. Creates a new list of non-overlapping intervals representing unique watched content

```javascript
// Pseudocode for interval merging
function mergeIntervals(intervals) {
  if (intervals.length <= 1) return intervals;

  // Sort by start time
  intervals.sort((a, b) => a.start - b.start);

  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const lastMerged = result[result.length - 1];

    // Check if current interval overlaps with last merged interval
    if (current.start <= lastMerged.end) {
      // Merge by updating the end time to the maximum of both
      lastMerged.end = Math.max(lastMerged.end, current.end);
    } else {
      // No overlap, add as separate interval
      result.push(current);
    }
  }

  return result;
}
```

### Progress Calculation

Progress is calculated as the percentage of unique seconds watched:

```javascript
function calculateProgress(mergedIntervals, totalDuration) {
  const uniqueSecondsWatched = mergedIntervals.reduce(
    (sum, interval) => sum + (interval.end - interval.start),
    0
  );

  return (uniqueSecondsWatched / totalDuration) * 100;
}
```

### Challenges and Solutions

1. **Browser Memory Management**:

   - **Challenge**: Storing intervals for long videos could consume excessive memory
   - **Solution**: Implemented periodic server syncing and interval compression

2. **Handling Seek Events**:

   - **Challenge**: Users jumping around the video created fragmented intervals
   - **Solution**: Implemented a buffer time to determine whether jumps should create new intervals or extend existing ones

3. **Network Disconnections**:

   - **Challenge**: Progress loss if network disconnected during viewing
   - **Solution**: Added local storage fallback and reconnection retry logic

4. **Performance Optimization**:
   - **Challenge**: Frequent interval calculations affecting playback smoothness
   - **Solution**: Debounced calculations and moved heavy processing to web workers when supported

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
