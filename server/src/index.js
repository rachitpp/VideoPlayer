const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const rateLimit = require("express-rate-limit");

// Routes for handling progress data
const progressRoutes = require("./routes/progress");

// Config and setup
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Timer for MongoDB reconnection attempts
let reconnectTimer;

// Limit API requests to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 60, // 60 requests per minute
  standardHeaders: true,
  message: { error: "Too many requests, please try again later" },
});

function setupMongoReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);

  reconnectTimer = setTimeout(() => {
    console.log("Attempting to reconnect to MongoDB...");
    mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => {
        console.log("Reconnected to MongoDB");
        global.isDbConnected = true;
      })
      .catch((error) => {
        console.error("MongoDB reconnection failed:", error);
        setupMongoReconnect(); // Try again later
      });
  }, 60000); // Every minute
}

// Basic CORS setup
app.use(cors());

app.use(express.json());

// Apply rate limiting to API routes
app.use("/api", apiLimiter);

// Fallback storage if MongoDB is down
global.inMemoryStore = {
  progressData: {},
  saveProgress: function (userId, videoId, data) {
    const key = `${userId}:${videoId}`;
    this.progressData[key] = data;
    return { ...data };
  },
  getProgress: function (userId, videoId) {
    const key = `${userId}:${videoId}`;
    return this.progressData[key] || null;
  },
};

// Track database connection status
global.isDbConnected = false;

// Set up API routes
app.use("/api/progress", progressRoutes);

// Home route - shows basic info
app.get("/", (req, res) => {
  res.json({
    message: "Lecture Video Progress Tracker API",
    dbStatus: global.isDbConnected ? "Connected" : "Using in-memory fallback",
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    global.isDbConnected = true;
    startServer();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    console.log("Starting server with in-memory storage fallback...");
    startServer();
    setupMongoReconnect();
  });

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(
      `Database: ${global.isDbConnected ? "MongoDB" : "In-memory fallback"}`
    );
  });
}
module.exports = app;
