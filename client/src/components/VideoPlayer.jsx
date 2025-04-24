import { useState, useRef, useEffect } from "react";
import useVideoProgress from "../hooks/useVideoProgress";
import "./VideoPlayer.css";
import React from "react";

function VideoPlayer({ videoUrl, videoId, userId = "user123" }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [debug, setDebug] = useState(false);

  // Our custom hook handles all the progress tracking magic
  const {
    loading,
    error,
    progressPercentage: rawProgressPercentage,
    watchedIntervals,
    lastWatchedTime,
    totalDuration,
    handleTimeUpdate,
    handleDurationChange,
    handlePlay,
    handlePause,
    syncWithServer,
  } = useVideoProgress(userId, videoId);

  // Guard against NaN values in progress
  const [safeProgressPercentage, setSafeProgressPercentage] = useState(0);

  useEffect(() => {
    if (!isNaN(rawProgressPercentage) && rawProgressPercentage > 0) {
      setSafeProgressPercentage((prev) =>
        Math.max(prev, rawProgressPercentage)
      );
      console.log(`Updated safe progress to: ${rawProgressPercentage}%`);
    } else {
      console.log(`Ignoring invalid progress value: ${rawProgressPercentage}`);
    }
  }, [rawProgressPercentage]);

  // Format seconds to MM:SS display
  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Jump to the last position when video loads
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && lastWatchedTime > 0 && !loading) {
      console.log("Setting video to last watched position:", lastWatchedTime);
      videoElement.currentTime = lastWatchedTime;
      setCurrentTime(lastWatchedTime);
    }
  }, [videoRef, lastWatchedTime, loading]);

  const handleVideoPlay = () => {
    const videoElement = videoRef.current;
    if (videoElement) {
      setIsPlaying(true);
      handlePlay(videoElement.currentTime);
    }
  };

  const handleVideoPause = () => {
    const videoElement = videoRef.current;
    if (videoElement) {
      setIsPlaying(false);
      handlePause(videoElement.currentTime);
    }
  };

  const handleVideoTimeUpdate = () => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const newTime = videoElement.currentTime;

      // Update UI less frequently to avoid render spam
      const now = Date.now();
      if (now - (handleVideoTimeUpdate.lastUIUpdate || 0) > 500) {
        handleVideoTimeUpdate.lastUIUpdate = now;
        setCurrentTime(newTime);
      }

      handleTimeUpdate(newTime);
    }
  };

  const handleVideoLoadedMetadata = () => {
    const videoElement = videoRef.current;
    if (videoElement) {
      const duration = videoElement.duration;
      console.log("Video metadata loaded, duration:", duration);
      setVideoDuration(duration);
      handleDurationChange(duration);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    const videoElement = videoRef.current;
    if (videoElement) {
      syncWithServer(videoElement.duration);
    }
  };

  const togglePlay = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      videoElement.pause();
    } else {
      videoElement.play();
    }
  };

  const toggleDebug = () => {
    setDebug(!debug);
  };

  // Save progress when user closes the page
  useEffect(() => {
    const handleBeforeUnload = () => {
      const videoElement = videoRef.current;
      if (videoElement) {
        console.log("Page unloading, syncing final progress...");
        syncWithServer(videoElement.currentTime);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [syncWithServer]);

  // Debug panel is memoized to prevent unnecessary renders
  const debugPanel = React.useMemo(
    () => (
      <div className="debug-panel">
        <div className="debug-section-title">
          <h4>Debug Information</h4>
          <span className="debug-badge">
            {watchedIntervals.length} intervals
          </span>
        </div>

        <p>
          Video Duration:{" "}
          <span className="time-value">
            {formatTime(videoDuration)} ({videoDuration.toFixed(2)}s)
          </span>
        </p>
        <p>
          Current Time:{" "}
          <span className="time-value">
            {formatTime(currentTime)} ({currentTime.toFixed(2)}s)
          </span>
        </p>
        <p>
          Progress:{" "}
          <span className="percentage-value">
            {safeProgressPercentage.toFixed(2)}%
          </span>
        </p>
        <p>
          Last Watched Time:{" "}
          <span className="time-value">
            {formatTime(lastWatchedTime)} ({lastWatchedTime}s)
          </span>
        </p>
        <p>
          Total Duration (Server):{" "}
          <span className="time-value">
            {formatTime(totalDuration)} ({totalDuration}s)
          </span>
        </p>
        <p>
          Total Intervals:{" "}
          <span className="count-value">{watchedIntervals.length}</span>
        </p>
        <p>
          Total Unique Seconds:{" "}
          <span className="count-value">
            {watchedIntervals.reduce(
              (sum, interval) => sum + (interval.end - interval.start + 1),
              0
            )}
            s
          </span>
        </p>

        <h5>Watched Intervals</h5>
        <ul>
          {watchedIntervals.length > 0 ? (
            watchedIntervals.map((interval, index) => (
              <li key={index}>
                <span className="time-value">{formatTime(interval.start)}</span>{" "}
                -<span className="time-value">{formatTime(interval.end)}</span>
                <span className="count-value">
                  ({interval.end - interval.start + 1}s)
                </span>
              </li>
            ))
          ) : (
            <li>No intervals tracked yet</li>
          )}
        </ul>
      </div>
    ),
    [
      watchedIntervals,
      videoDuration,
      currentTime,
      safeProgressPercentage,
      lastWatchedTime,
      totalDuration,
      formatTime,
    ]
  );

  if (loading) {
    return (
      <div className="video-player-container">
        <div className="loading-message">Loading video progress...</div>
      </div>
    );
  }

  return (
    <div className="video-player-container">
      {error && <div className="error-message">{error}</div>}

      <div className="video-tracker-header">
        <h2>Video Progress Tracker</h2>
      </div>

      <div className="main-content-layout">
        <div className="video-content">
          <div className="video-wrapper">
            <video
              ref={videoRef}
              className="video-player"
              onPlay={handleVideoPlay}
              onPause={handleVideoPause}
              onTimeUpdate={handleVideoTimeUpdate}
              onLoadedMetadata={handleVideoLoadedMetadata}
              onEnded={handleVideoEnded}
              src={videoUrl}
              controls
            />
          </div>

          <div className="video-controls">
            <div className="controls-row">
              <button
                className={`play-button ${isPlaying ? "pause" : "play"}`}
                onClick={togglePlay}
              ></button>

              <div className="progress-container">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${safeProgressPercentage}%`,
                    }}
                  />
                </div>

                <div className="progress-info">
                  <span>{formatTime(currentTime)}</span>
                  <span>Watched: {safeProgressPercentage.toFixed(2)}%</span>
                  <span>{formatTime(videoDuration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="debug-content">
          <div className="debug-controls">
            <button onClick={toggleDebug} className="debug-button">
              {debug ? "Hide Video Info" : "Video Info"}
            </button>
          </div>

          {debug && debugPanel}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
