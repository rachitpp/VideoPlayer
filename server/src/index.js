const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

// Import routes
const progressRoutes = require("./routes/progress");

// Config
dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Basic CORS setup
app.use(cors());

app.use(express.json());

// In-memory store as fallback if MongoDB fails
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

// Set a flag for DB connection status
global.isDbConnected = false;

// Routes
app.use("/api/progress", progressRoutes);

// Default route
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
  });

function startServer() {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(
      `Database: ${global.isDbConnected ? "MongoDB" : "In-memory fallback"}`
    );
  });
}
