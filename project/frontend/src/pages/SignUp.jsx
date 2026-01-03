import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchCurrentUser, signOut, signUp } from '../utils/auth';

export default function SignUp() {
  const navigate = useNavigate();
  const [storedUser, setStoredUserState] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((user) => {
        if (active) setStoredUserState(user);
      })
      .catch(() => {
        if (active) setStoredUserState(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Name is required.');
      return;
    }
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    signUp({ name: trimmedName, email: trimmedEmail, password })
      .then((user) => {
        setStoredUserState(user);
        navigate('/');
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  const handleDisconnect = () => {
    signOut()
      .then(() => {
        setStoredUserState(null);
        setName('');
        setEmail('');
        setPassword('');
      })
      .catch((err) => {
        setError(err.message);
      });
  };

  return (
    <div className="auth-page">
      <header className="nav">
        <Link className="brand" to="/">
          <img className="brand-logo" src="/logo.png" alt="WatchTogether logo" />
          <span>WatchTogether</span>
        </Link>
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

      <div className="auth-shell">
        <div className="auth-card">
          <p className="auth-eyebrow">Get Started</p>
          <h1>Create your account</h1>
          <p className="auth-subtitle">Pick a display name and start creating rooms in seconds.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label>Display name</label>
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Alex"
              />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
              />
            </div>

            <div className="auth-actions">
              <button className="pill primary wide" type="submit">Create Account</button>
              <Link className="ghost" to="/">Back to Home</Link>
            </div>
          </form>

          {error && <p className="error">Error: {error}</p>}
          <p className="auth-note">Session is stored in an httpOnly cookie.</p>
          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link className="auth-link" to="/sign-in">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
