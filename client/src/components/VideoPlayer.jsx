import { useState, useRef, useEffect } from "react";
import useVideoProgress from "../hooks/useVideoProgress";
import "./VideoPlayer.css";

function VideoPlayer({ videoUrl, videoId, userId = "user123" }) {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [debug, setDebug] = useState(false);

  // Use the custom hook to track progress with props
  const {
    loading,
    error,
    progressPercentage,
    watchedIntervals,
    lastWatchedTime,
    totalDuration,
    handleTimeUpdate,
    handleDurationChange,
    handlePlay,
    handlePause,
    syncWithServer,
  } = useVideoProgress(userId, videoId);

  // Format time (seconds) to MM:SS
  const formatTime = (seconds) => {
    if (!seconds) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Set video to last watched position when loaded
  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement && lastWatchedTime > 0 && !loading) {
      console.log("Setting video to last watched position:", lastWatchedTime);
      videoElement.currentTime = lastWatchedTime;
      setCurrentTime(lastWatchedTime);
    }
  }, [videoRef, lastWatchedTime, loading]);

  // Handle video events
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
      setCurrentTime(newTime);
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

      <div className="video-header">
        <h2>Video Progress Tracker</h2>
        <div className="video-badge">Interactive Player</div>
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
              <button className="play-button" onClick={togglePlay}>
                <span className={isPlaying ? "pause-icon" : "play-icon"}></span>
              </button>

              <div className="progress-container">
                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>

                <div className="progress-info">
                  <span>{formatTime(currentTime)}</span>
                  <span>Watched: {progressPercentage.toFixed(2)}%</span>
                  <span>{formatTime(videoDuration)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="debug-content">
          <div className="debug-controls">
            <button onClick={toggleDebug} className="debug-button">
              {debug ? "Hide Debug Info" : "Show Debug Info"}
            </button>
          </div>

          {debug ? (
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
                  {progressPercentage.toFixed(2)}%
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
                    (sum, interval) =>
                      sum + (interval.end - interval.start + 1),
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
                      <span className="time-value">
                        {formatTime(interval.start)}
                      </span>{" "}
                      -
                      <span className="time-value">
                        {formatTime(interval.end)}
                      </span>
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
          ) : (
            <div className="debug-placeholder">
              <div>
                <p>
                  Click "Show Debug Info" to view detailed information about
                  your watching progress
                </p>
                <p>
                  Total watched:{" "}
                  <span className="percentage-value">
                    {progressPercentage.toFixed(2)}%
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
