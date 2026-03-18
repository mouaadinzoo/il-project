import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Playlist from '../components/Playlist';
import Chat from '../components/Chat';
import useSocket from '../hooks/useSocket';

const ROLE_LABELS = {
  director: 'Realisateur',
  moderator: 'Moderateur',
  participant: 'Participant'
};

const ACTION_LABELS = {
  room_created: 'Salon cree',
  play_video: 'Lecture lancee',
  pause_video: 'Lecture mise en pause',
  seek_video: 'Position de lecture mise a jour',
  select_video: 'Video On-Air changee'
};

export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [shareCopied, setShareCopied] = useState(false);

  const user = useMemo(() => searchParams.get('user') || 'Guest', [searchParams]);
  const userId = location.state?.userId || null;
  const controllerToken = useMemo(() => {
    if (location.state?.controllerToken) return location.state.controllerToken;
    if (location.state?.hostSecret) return location.state.hostSecret;
    if (!roomId) return null;
    return (
      sessionStorage.getItem(`controllerToken:${roomId}`) ||
      sessionStorage.getItem(`hostSecret:${roomId}`) ||
      null
    );
  }, [location.state, roomId]);

  const {
    socketConnected,
    roomState,
    messages,
    role,
    canControlVideo,
    permissionError,
    roomError,
    clearPermissionError,
    sendVideoCommand,
    sendChatMessage
  } = useSocket({
    roomId,
    user,
    userId,
    controllerToken
  });

  useEffect(() => {
    if (!roomId) navigate('/');
  }, [roomId, navigate]);

  useEffect(() => {
    if (!controllerToken || !roomId) return;
    sessionStorage.setItem(`controllerToken:${roomId}`, controllerToken);
  }, [controllerToken, roomId]);

  const currentVideoId = roomState?.currentVideoId || 'dQw4w9WgXcQ';
  const playlist = roomState?.playlist?.length ? roomState.playlist : [currentVideoId];
  const viewerCount = roomState?.viewerCount ?? 1;
  const directorName = roomState?.directorName || 'Director';
  const roomTitle = roomState?.name || 'WatchTogether Room';
  const participants = roomState?.participants || [];
  const roleLabel = ROLE_LABELS[role] || ROLE_LABELS.participant;
  const directorPresenceLabel = useMemo(() => {
    if (!socketConnected) return 'offline';
    if (roomState?.directorOnline) return 'online';
    if (role === 'director') return 'online';
    if (!roomState) return 'syncing';
    return 'offline';
  }, [socketConnected, roomState, role]);

  const activityText = useMemo(() => {
    if (!roomState?.lastAction) return 'Etat synchronise par le serveur.';
    const actionLabel = ACTION_LABELS[roomState.lastAction] || roomState.lastAction;
    const actorName = roomState.lastActorName || directorName;
    return `${actionLabel} par ${actorName}.`;
  }, [roomState?.lastAction, roomState?.lastActorName, directorName]);

  const roleHint = canControlVideo
    ? 'Vos commandes controlent la lecture pour tout le salon.'
    : 'Vous suivez automatiquement la regie. Le chat reste disponible.';

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleSelectVideo = (nextVideoId) => {
    if (!canControlVideo || !nextVideoId) return;
    clearPermissionError();
    sendVideoCommand('select_video', { videoId: nextVideoId });
  };

  return (
    <div className="room-shell">
      <header className="nav room-nav">
        <Link className="brand" to="/">
          <img className="brand-logo" src="/logo.png" alt="WatchTogether logo" />
          <span>WatchTogether</span>
        </Link>

        <div className="room-actions">
          <div className="pill neutral soft">
            <span className="dot live" /> {viewerCount} watching
          </div>
          <div className="pill neutral">{roleLabel}</div>
          <div className="pill neutral soft">
            Regie: {directorName} {directorPresenceLabel}
          </div>
          <div className={`pill neutral soft ${socketConnected ? 'status-connected' : 'status-disconnected'}`}>
            {socketConnected ? 'Socket online' : 'Socket offline'}
          </div>
          <button className="pill secondary" onClick={handleShare}>
            {shareCopied ? 'Link copied' : 'Share room'}
          </button>
          <button className="pill primary" onClick={() => navigate('/')}>
            Leave
          </button>
        </div>
      </header>

      {roomError && <div className="room-alert error">Erreur salon: {roomError}</div>}
      {permissionError && <div className="room-alert warning">{permissionError.message}</div>}
      <div className="room-alert info">{roleHint}</div>

      <div className="room-grid">
        <div className="room-main">
          <div className="video-stage">
            <div className="video-frame">
              <VideoPlayer
                videoId={currentVideoId}
                roomState={roomState}
                canControlVideo={canControlVideo}
                onCommand={sendVideoCommand}
              />
            </div>
          </div>

          <div className="room-meta">
            <div>
              <p className="muted">Room</p>
              <h3 className="room-title-text">{roomTitle}</h3>
              <p className="muted small">Room ID: {roomId}</p>
              <p className="muted small">{activityText}</p>
            </div>

            <div className="room-right-meta">
              <div className="avatar-row">
                {participants.slice(0, 4).map((member) => (
                  <div
                    key={member.socketId}
                    className={`avatar ${member.role === 'director' ? 'director-avatar' : ''}`}
                    title={`${member.userName} (${ROLE_LABELS[member.role] || member.role})`}
                  >
                    {(member.userName || 'U')[0]}
                  </div>
                ))}
                {participants.length > 4 && <div className="avatar ghost-avatar">+{participants.length - 4}</div>}
              </div>
              <div className="participant-list">
                {participants.map((member) => (
                  <span
                    key={`${member.socketId}-label`}
                    className={`participant-chip ${member.userName === user ? 'participant-chip-active' : ''}`}
                  >
                    {member.userName} · {ROLE_LABELS[member.role] || member.role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Playlist
            videos={playlist}
            currentVideoId={currentVideoId}
            canControl={canControlVideo}
            controllerName={directorName}
            onAdd={handleSelectVideo}
            onSelect={handleSelectVideo}
          />
        </div>

        <div className="room-chat">
          <Chat user={user} messages={messages} onSend={sendChatMessage} title="Live Chat" />
        </div>
      </div>
    </div>
  );
}
