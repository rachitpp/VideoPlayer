import { Link } from "react-router-dom";
import { videos } from "../utils/videoData";
import "./HomePage.css";

function HomePage() {
  return (
    <div className="home-container">
      <header className="header">
        <div className="logo">
          <div className="logo-wrapper">
            <span className="logo-icon">▶</span>
            <h1>CineTrack</h1>
          </div>
          <p className="tagline">Remember every moment</p>
        </div>
        <nav className="nav-links">
          <a href="#features">Features</a>
          <a href="#videos">Library</a>
          <a href="#" className="btn-account">
            My Account
          </a>
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-content">
          <h1>
            Watch. Track. <span className="highlight">Remember.</span>
          </h1>
          <p>
            Never lose your place again. Our intelligent tracking system
            remembers exactly which parts you've watched, so you can pick up
            right where you left off.
          </p>
          <div className="hero-buttons">
            <a href="#videos" className="btn-primary">
              Browse Videos
            </a>
            <a href="#features" className="btn-secondary">
              Learn More
            </a>
          </div>
        </div>
        <div className="hero-image">
          <div className="video-player-mockup">
            <div className="mockup-header">
              <div className="controls-dot"></div>
              <div className="controls-dot"></div>
              <div className="controls-dot"></div>
            </div>
            <div className="mockup-content">
              <div className="play-button-large">▶</div>
            </div>
            <div className="mockup-progress">
              <div className="progress-track">
                <div className="progress-segments">
                  <div className="segment watched"></div>
                  <div className="segment unwatched"></div>
                  <div className="segment watched"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <h2 className="section-title">
          Why Choose <span className="highlight">CineTrack</span>?
        </h2>

        <div className="features">
          <div className="feature">
            <div className="feature-icon">⏱️</div>
            <div className="feature-content">
              <h3>Second-Level Precision</h3>
              <p>
                Our technology tracks exactly which parts of the video you've
                watched, not just your furthest point.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">💾</div>
            <div className="feature-content">
              <h3>Seamless Syncing</h3>
              <p>
                Your progress is automatically saved and synced across all your
                devices and sessions.
              </p>
            </div>
          </div>

          <div className="feature">
            <div className="feature-icon">↩️</div>
            <div className="feature-content">
              <h3>Smart Resume</h3>
              <p>
                Continue exactly where you left off, even if you closed your
                browser weeks ago.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="videos" className="video-section">
        <div className="section-header">
          <h2 className="section-title">Featured Collection</h2>
          <div className="section-actions">
            <button className="btn-view-all">View All</button>
          </div>
        </div>

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
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-icon small">▶</span>
            <span className="footer-brand">CineTrack</span>
          </div>

          <div className="footer-links">
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#">About Us</a>
              <a href="#">Contact</a>
              <a href="#">Careers</a>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <a href="#">Help Center</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2023 CineTrack - Precision Video Progress Tracking</p>
          <div className="social-links">
            <a href="#" className="social-icon">
              📱
            </a>
            <a href="#" className="social-icon">
              💻
            </a>
            <a href="#" className="social-icon">
              📧
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default HomePage;
