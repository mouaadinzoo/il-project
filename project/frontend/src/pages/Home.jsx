import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCurrentUser, signOut } from '../utils/auth';

const API_BASE = 'http://localhost:4000/api/rooms';
const featureList = [
  {
    title: 'Instant Rooms',
    desc: 'Create a watch room in seconds. No downloads, no setup. Just click and start watching together.',
    icon: '⚡'
  },
  {
    title: 'Perfect Sync',
    desc: 'Advanced synchronization ensures everyone watches at exactly the same moment. No lag, no delays.',
    icon: '🔄'
  },
  {
    title: 'Live Chat',
    desc: 'React and chat in real-time. Share your thoughts and reactions as the story unfolds.',
    icon: '💬'
  }
];

// Landing page styled to match the provided purple hero design.
export default function Home() {
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const [storedUser, setStoredUser] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((user) => {
        if (active) setStoredUser(user);
      })
      .catch(() => {
        if (active) setStoredUser(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const displayName = storedUser?.name?.trim() || userName.trim() || 'Guest';

  const handleDisconnect = async () => {
    try {
      await signOut();
      setStoredUser(null);
      setUserName('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: roomName || 'My Room', user: displayName })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.hostSecret) {
        sessionStorage.setItem(`hostSecret:${data.id}`, data.hostSecret);
      }
      navigate(`/room/${data.id}?user=${encodeURIComponent(displayName)}`, { state: { hostSecret: data.hostSecret } });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoin = async () => {
    try {
      setError(null);
      if (!roomIdToJoin.trim()) throw new Error('Room ID is required to join.');
      const res = await fetch(`${API_BASE}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomId: roomIdToJoin.trim(), user: displayName })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      navigate(`/room/${data.id}?user=${encodeURIComponent(displayName)}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="hero-page">
      <header className="nav">
        <Link className="brand" to="/">
          <img className="brand-logo" src="/logo.png" alt="WatchTogether logo" />
          <span>WatchTogether</span>
        </Link>
        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#features">Features</a>
          <a href="#how">How it Works</a>
          <a href="#pricing">Pricing</a>
        </nav>
        <div className="nav-actions">
          {storedUser ? (
            <div className="nav-user">
              <div className="pill neutral user-chip">{storedUser.name}</div>
              <button className="pill secondary" type="button" onClick={handleDisconnect}>
                Disconnect
              </button>
            </div>
          ) : (
            <>
              <Link className="ghost" to="/sign-in">Sign In</Link>
              <Link className="pill primary" to="/get-started">Get Started</Link>
            </>
          )}
        </div>
      </header>

      <section className="hero" id="home">
        <div className="hero-text">
          <div className="badge">Watch Movies & Shows Together</div>
          <h1>
            Connect.
            <span className="accent"> Watch.</span> Together.
          </h1>
          <p className="lede">
            Experience watching videos and shows with friends, no matter where they are. Create your virtual cinema room in
            seconds.
          </p>

          <div className="cta-buttons">
            <button className="pill primary wide" onClick={handleCreate}>
              + Create a Room
            </button>
            <button className="pill secondary wide" onClick={handleJoin}>
              ↳ Join a Room
            </button>
          </div>

          <div className="form-panel">
            {storedUser ? (
              <div className="input-group">
                <label>Signed in as</label>
                <div className="signed-in">
                  <span>{storedUser.name}</span>
                  <Link className="ghost" to="/sign-in">Change</Link>
                </div>
              </div>
            ) : (
              <div className="input-group">
                <label>Your name</label>
                <input value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Guest" />
              </div>
            )}
            <div className="input-group">
              <label>Room name (for Create)</label>
              <input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="My Room" />
            </div>
            <div className="input-group">
              <label>Room ID (for Join)</label>
              <input value={roomIdToJoin} onChange={(e) => setRoomIdToJoin(e.target.value)} placeholder="e.g. a1b2c3" />
            </div>
          </div>
          {error && <p className="error">Error: {error}</p>}
        </div>

        <div className="hero-card" aria-label="Live room preview">
          <div className="live-card">
            <img
              src="https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=800&q=80"
              alt="Friends watching together"
            />
            <div className="live-bar">
              <div className="live-dot" />
              <span>Live Now</span>
              <div className="spacer" />
              <span className="pill neutral">4 watching</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features">
        <div className="feature-badge">Features</div>
        <h2 className="feature-title">Everything You Need</h2>
        <p className="feature-subtitle">Powerful features for the ultimate watch party experience</p>
        <div className="feature-grid">
          {featureList.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="steps-section" id="how">
        <div className="feature-badge">How It Works</div>
        <h2 className="feature-title">Start in 3 Simple Steps</h2>
        <p className="feature-subtitle">Create, invite, and watch together effortlessly.</p>
        <div className="steps-grid">
          {[
            {
              num: '1',
              title: 'Create Your Room',
              desc: 'Click "Create a Room" and get your unique room link instantly. Customize your room name and settings.'
            },
            {
              num: '2',
              title: 'Invite Friends',
              desc: 'Share your room link with friends via text, email, or social media. They can join with one click.'
            },
            {
              num: '3',
              title: 'Watch Together',
              desc: 'Start your video, and everyone watches in perfect sync. Chat, react, and enjoy together!'
            }
          ].map((step) => (
            <div className="step-card" key={step.num}>
              <div className="step-bubble">
                <span>{step.num}</span>
                <div className="step-check">✓</div>
              </div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section" id="pricing">
        <h2 className="cta-title">Ready to Watch Together?</h2>
        <p className="cta-subtitle">
          Create your first room now and invite your friends for an unforgettable experience.
        </p>
        <button className="pill primary wide cta-button" onClick={handleCreate}>
          + Create Your Room Now →
        </button>
        <p className="cta-footnote">No credit card required • Free forever</p>
      </section>

      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="brand footer-brand">
              <img className="brand-logo" src="/logo.png" alt="WatchTogether logo" />
              <span>WatchTogether</span>
            </div>
            <p className="footer-text">The best way to watch movies and shows with friends online.</p>
          </div>
          <div className="footer-columns">
            <div>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#faq">FAQ</a>
            </div>
            <div>
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#blog">Blog</a>
              <a href="#contact">Contact</a>
            </div>
            <div>
              <h4>Follow Us</h4>
              <div className="social-row">
                <a className="social-icon"></a>
                <a className="social-icon"></a>
                <a className="social-icon"></a>
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2024 WatchTogether. All rights reserved.</span>
          <div className="footer-links">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
