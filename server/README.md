# Lecture Video Progress Tracker - Server

This is the backend server for the Lecture Video Progress Tracker.

## Features

- RESTful API for tracking video progress
- Smart interval merging for accurate progress tracking
- MongoDB storage for persistence
- Express.js server

## Technology Stack

- Node.js
- Express.js
- MongoDB
- JavaScript

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB installed and running
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/lecture-video-tracker
   NODE_ENV=development
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

## API Documentation

### Get Progress

- **URL**: `/api/progress/:userId/:videoId`
- **Method**: `GET`
- **Response**:
  ```json
  {
    "progress": 45.67,
    "watchedIntervals": [
      { "start": 0, "end": 30 },
      { "start": 40, "end": 60 }
    ],
    "lastWatchedTime": 60,
    "totalDuration": 120
  }
  ```

### Update Progress

- **URL**: `/api/progress/:userId/:videoId`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "newIntervals": [
      { "start": 61, "end": 70 }
    ],
    "lastWatchedTime": 70,
    "totalDuration": 120
  }
  ```
- **Response**:
  ```json
  {
    "message": "Progress updated successfully",
    "progress": 50.0,
    "watchedIntervals": [
      { "start": 0, "end": 30 },
      { "start": 40, "end": 70 }
    ],
    "lastWatchedTime": 70
  }
  ```

## Core Algorithm

The server uses a sophisticated interval merging algorithm to ensure accurate progress tracking:

1. It sorts intervals by start time
2. Merges overlapping or adjacent intervals
3. Calculates total unique seconds watched
4. Computes progress as percentage of total video duration

This ensures that re-watching the same parts of a video doesn't artificially inflate progress stats. 