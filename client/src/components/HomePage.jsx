import { Link } from "react-router-dom";
import { videos } from "../utils/videoData";
import "./HomePage.css";

function HomePage() {
  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">
          <span className="logo-icon">▶</span>
          <h1>VideoTracker</h1>
        </div>
        <p className="tagline">Smart progress tracking</p>
      </header>

      <section className="info-banner">
        <div className="info-content">
          <h2>Track your watching progress with precision</h2>
          <p>
            Unlike traditional video players that only track the furthest point
            reached, our system records exactly which seconds you've watched.
          </p>
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <div className="feature-icon">⏱️</div>
          <h3>Second-Level Precision</h3>
          <p>Records exactly which parts of videos you've watched</p>
        </div>
        <div className="feature">
          <div className="feature-icon">💾</div>
          <h3>Progress Syncing</h3>
          <p>Your progress is saved and synced across sessions</p>
        </div>
        <div className="feature">
          <div className="feature-icon">↩️</div>
          <h3>Smart Resume</h3>
          <p>Continue exactly where you left off</p>
        </div>
        <div className="feature">
          <div className="feature-icon">📊</div>
          <h3>Detailed Stats</h3>
          <p>View your watching habits and progress</p>
        </div>
      </section>

      <section className="video-section">
        <h2>Available Videos</h2>
        <div className="video-grid">
          {videos.map((video) => (
            <Link
              to={`/video/${video.id}`}
              key={video.id}
              className="video-card"
            >
              <div className="thumbnail-container">
                <img src={video.thumbnail} alt={video.title} />
                <div className="video-overlay">
                  <div className="play-icon">▶</div>
                  <span className="duration">{video.duration}</span>
                </div>
              </div>
              <div className="video-info">
                <h3>{video.title}</h3>
                <p>{video.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <footer className="footer">
        <p>
          © 2023 Video Progress Tracker | <a href="#top">Back to top</a>
        </p>
      </footer>
    </div>
  );
}

export default HomePage;
