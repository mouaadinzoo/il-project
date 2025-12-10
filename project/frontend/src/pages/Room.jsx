import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Playlist from '../components/Playlist';
import Chat from '../components/Chat';
import useSocket from '../hooks/useSocket';

// Main room view combines player, playlist, and chat.
export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const user = useMemo(() => searchParams.get('user') || 'Guest', [searchParams]);
  const [shareCopied, setShareCopied] = useState(false);
  const [roomTitle, setRoomTitle] = useState('WatchTogether Room');
  const [editingTitle, setEditingTitle] = useState(false);

  const [videoId, setVideoId] = useState('dQw4w9WgXcQ');
  const [playlist, setPlaylist] = useState(['dQw4w9WgXcQ']);
  const { socketConnected, remoteSync, messages, sendVideoAction, sendChatMessage } = useSocket({
    roomId,
    user
  });

  useEffect(() => {
    if (!roomId) navigate('/');
  }, [roomId, navigate]);

  // Apply remote video change to local state.
  useEffect(() => {
    if (remoteSync?.action === 'change_video' && remoteSync.videoId) {
      setVideoId(remoteSync.videoId);
      if (!playlist.includes(remoteSync.videoId)) {
        setPlaylist((prev) => [...prev, remoteSync.videoId]);
      }
    }
  }, [remoteSync, playlist]);

  const handleAddVideo = (newVideoId) => {
    setPlaylist((prev) => (prev.includes(newVideoId) ? prev : [...prev, newVideoId]));
    setVideoId(newVideoId);
    sendVideoAction('change_video', 0, newVideoId);
  };

  const handleSelectVideo = (id) => {
    setVideoId(id);
    sendVideoAction('change_video', 0, id);
  };

  const viewerCount = useMemo(() => {
    const users = new Set(messages.map((m) => m.user || 'Guest'));
    users.add(user);
    return users.size;
  }, [messages, user]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  return (
    <div className="room-shell">
      <header className="nav room-nav">
        <div className="brand">
          <img className="brand-logo" src="/logo.png" alt="WatchTogether logo" />
          <span>WatchTogether</span>
        </div>
        <div className="room-actions">
          <div className="pill neutral soft">
            <span className="dot live" /> {viewerCount} watching
          </div>
          <button className="pill secondary" onClick={handleShare}>
            {shareCopied ? 'Link Copied' : 'Share Room'}
          </button>
          <button className="pill primary" onClick={() => navigate('/')}>
            Leave
          </button>
        </div>
      </header>

      <div className="room-grid">
        <div className="room-main">
          <div className="video-stage">
            <div className="video-frame">
              <VideoPlayer
                videoId={videoId}
                remoteSync={remoteSync}
                onAction={(action, time, vid) => sendVideoAction(action, time, vid || videoId)}
                onVideoIdChange={setVideoId}
              />
            </div>
          </div>
          <div className="room-meta">
            <div>
              <p className="muted">Room</p>
              <div className="room-title-row">
                {editingTitle ? (
                  <input
                    autoFocus
                    className="room-title-input"
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    onBlur={() => setEditingTitle(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setEditingTitle(false);
                      if (e.key === 'Escape') setEditingTitle(false);
                    }}
                  />
                ) : (
                  <>
                    <h3 className="room-title-text">{roomTitle}</h3>
                    <button className="icon-btn" aria-label="Edit room name" onClick={() => setEditingTitle(true)}>
                      ✏️
                    </button>
                  </>
                )}
              </div>
              <p className="muted small">Room ID: {roomId}</p>
            </div>
            <div className="avatar-row">
              <div className="avatar">{user?.[0] || 'U'}</div>
              <div className="avatar ghost-avatar">+</div>
            </div>
          </div>
          <Playlist videos={playlist} onAdd={handleAddVideo} onSelect={handleSelectVideo} currentVideoId={videoId} />
        </div>

        <div className="room-chat">
          <Chat user={user} messages={messages} onSend={(text) => sendChatMessage(text)} title="Live Chat" />
        </div>
      </div>
    </div>
  );
}
