# Lecture Video Progress Tracker - Client

This is the frontend React application for the Lecture Video Progress Tracker.

## Features

- HTML5 video player with progress tracking
- Real-time progress display
- Track only unique seconds watched (no double-counting)
- Resume from last watched position
- Clean and simple UI

## Technology Stack

- React (Vite)
- JavaScript
- HTML5 Video API
- CSS

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to the URL shown in the terminal (typically http://localhost:5173)

## How It Works

The application uses a custom React hook (`useVideoProgress`) to track the intervals of a video that have been watched. This tracking is done by:

1. Capturing time updates from the video player
2. Tracking continuous intervals of watching
3. Merging overlapping intervals to avoid double-counting
4. Syncing with the server periodically

The progress is calculated as the percentage of unique seconds watched out of the total video duration.

## Connection to Backend

This application connects to the Express backend running on `http://localhost:5000`. Make sure the backend server is running before using the application.

## Customization

You can replace the sample video with your own by:

1. Placing a video file in the public directory
2. Updating the `DEMO_VIDEO_URL` constant in `src/components/VideoPlayer.jsx`
