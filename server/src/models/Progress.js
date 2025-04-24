const mongoose = require("mongoose");

// Schema for time intervals (start and end points)
const intervalSchema = new mongoose.Schema({
  start: {
    type: Number,
    required: true,
  },
  end: {
    type: Number,
    required: true,
  },
});

// Main schema for tracking video progress
const progressSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    videoId: {
      type: String,
      required: true,
    },
    watchedIntervals: [intervalSchema],
    progress: {
      type: Number,
      default: 0,
    },
    lastWatchedTime: {
      type: Number,
      default: 0,
    },
    totalDuration: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// For faster lookups by user/video combination
progressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);
