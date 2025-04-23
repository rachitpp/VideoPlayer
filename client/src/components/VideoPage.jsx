import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import VideoPlayer from "./VideoPlayer";
import { getVideoById } from "../utils/videoData";
import "./VideoPage.css";

function VideoPage() {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Find the video with the matching ID
    const foundVideo = getVideoById(videoId);
    if (foundVideo) {
      setVideo(foundVideo);
    }
    setLoading(false);
  }, [videoId]);

  if (loading) {
    return <div className="loading">Loading video...</div>;
  }

  if (!video) {
    return (
      <div className="video-not-found">
        <h2>Video Not Found</h2>
        <p>Sorry, we couldn't find the video you're looking for.</p>
        <Link to="/" className="back-link">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="video-page">
      <div className="video-page-header">
        <div className="back-button">
          <Link to="/" className="back-link">
            ← Back to Videos
          </Link>
        </div>
        <div className="video-page-info">
          <h1>{video.title}</h1>
          <p>{video.description}</p>
        </div>
      </div>

      <div className="video-container">
        <VideoPlayer
          videoUrl={video.source}
          videoId={video.id}
          userId="user123" // Hardcoded user ID for demo
        />
      </div>
    </div>
  );
}

export default VideoPage;
