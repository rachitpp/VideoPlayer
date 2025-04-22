import './App.css';
import VideoPlayer from './components/VideoPlayer';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Lecture Video Progress Tracker</h1>
        <p>Watch videos and track your progress</p>
      </header>
      <main>
        <VideoPlayer />
      </main>
      <footer>
        <p>MERN Stack Demo Application</p>
      </footer>
    </div>
  );
}

export default App;
