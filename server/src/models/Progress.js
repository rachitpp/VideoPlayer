const mongoose = require('mongoose');

const intervalSchema = new mongoose.Schema({
  start: {
    type: Number,
    required: true
  },
  end: {
    type: Number,
    required: true
  }
});

const progressSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  videoId: {
    type: String,
    required: true
  },
  watchedIntervals: [intervalSchema],
  progress: {
    type: Number,
    default: 0
  },
  lastWatchedTime: {
    type: Number,
    default: 0
  },
  totalDuration: {
    type: Number,
    required: true
  }
}, { timestamps: true });

// Compound index for efficient queries
progressSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('Progress', progressSchema); 