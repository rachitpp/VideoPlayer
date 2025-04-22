# Lecture Video Progress Tracker

A MERN stack application for tracking video lecture progress with unique watch time tracking.

## Features

- Real-time progress tracking based on unique seconds watched
- Progress persistence across sessions
- Smart interval merging for accurate progress calculation
- Auto-resume from last watched position
- Clean and intuitive user interface

## Tech Stack

### Frontend
- React (Vite)
- TypeScript
- CSS (vanilla)
- HTML5 Video Player

### Backend
- Node.js
- Express.js
- MongoDB
- TypeScript

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB installed and running
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

## Project Structure

```
.
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── utils/        # Utility functions
│   │   └── types/        # TypeScript type definitions
│   └── ...
│
└── server/                # Backend Express application
    ├── src/
    │   ├── controllers/  # Route controllers
    │   ├── models/       # MongoDB models
    │   ├── routes/       # API routes
    │   └── utils/        # Utility functions
    └── ...
``` 