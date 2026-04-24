import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer';
import Playlist from '../components/Playlist';
import Chat from '../components/Chat';
import useSocket from '../hooks/useSocket';
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLE_OPTIONS,
  getRoleHint
} from '../utils/roomRoles';

const ACTION_LABELS = {
  room_created: 'Salon cree',
  assign_role: 'Role mis a jour',
  play_video: 'Lecture lancee',
  pause_video: 'Lecture mise en pause',
  seek_video: 'Position de lecture mise a jour',
  select_video: 'Video On-Air changee'
};

const LIVE_REACTIONS = ['❤️', '😂', '🔥', '👏'];

export default function Room() {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [shareCopied, setShareCopied] = useState(false);
  const [roomIdCopied, setRoomIdCopied] = useState(false);
  const [videoTitles, setVideoTitles] = useState({});

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
    reactions,
    role,
    canControlPlayback,
    canSelectVideo,
    canManageRoles,
    permissionError,
    roomError,
    clearPermissionError,
    sendVideoCommand,
    sendChatMessage,
    sendReaction,
    assignRole
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

  const currentVideoId = roomState?.currentVideoId || 'M7lc1UVf-VE';
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

  const roleHint = useMemo(() => getRoleHint(role), [role]);

  useEffect(() => {
    const missingVideoIds = playlist.filter((videoId) => videoId && !videoTitles[videoId]);
    if (!missingVideoIds.length) return undefined;

    const controller = new AbortController();

    missingVideoIds.forEach(async (videoId) => {
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
            `https://www.youtube.com/watch?v=${videoId}`
          )}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error('Video title unavailable');
        const data = await response.json();
        const title = String(data.title || '').trim();
        if (!title) return;

        setVideoTitles((currentTitles) => ({
          ...currentTitles,
          [videoId]: title
        }));
      } catch (err) {
        if (err.name !== 'AbortError') {
          setVideoTitles((currentTitles) => ({
            ...currentTitles,
            [videoId]: videoId
          }));
        }
      }
    });

    return () => controller.abort();
  }, [playlist, videoTitles]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareCopied(true);
      window.setTimeout(() => setShareCopied(false), 1800);
    } catch (err) {
      console.error('Share failed', err);
    }
  };

  const handleCopyRoomId = async () => {
    if (!roomId) return;

    try {
      await navigator.clipboard.writeText(roomId);
      setRoomIdCopied(true);
      window.setTimeout(() => setRoomIdCopied(false), 1800);
    } catch (err) {
      console.error('Copy room ID failed', err);
    }
  };

  const handleSelectVideo = (nextVideoId) => {
    if (!canSelectVideo || !nextVideoId) return;
    clearPermissionError();
    sendVideoCommand('select_video', { videoId: nextVideoId });
  };

  const handleRoleChange = (targetSocketId, nextRole) => {
    if (!canManageRoles || !targetSocketId || !nextRole) return;
    clearPermissionError();
    assignRole(targetSocketId, nextRole);
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
          <button className="pill secondary" onClick={handleCopyRoomId}>
            {roomIdCopied ? 'ID copied' : 'Copy ID'}
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
            <div className="reaction-layer" aria-live="polite">
              {reactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className="floating-reaction"
                  style={{ left: `${reaction.left}%` }}
                  title={`${reaction.user || 'Guest'}: ${reaction.emoji}`}
                >
                  <span>{reaction.emoji}</span>
                  <small>{reaction.user || 'Guest'}</small>
                </div>
              ))}
            </div>
            <div className="video-frame">
              <VideoPlayer
                videoId={currentVideoId}
                videoTitle={videoTitles[currentVideoId]}
                roomState={roomState}
                canControlPlayback={canControlPlayback}
                onCommand={sendVideoCommand}
              />
            </div>
            <div className="reaction-bar" aria-label="Live reactions">
              {LIVE_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="reaction-button"
                  onClick={() => sendReaction(emoji)}
                  aria-label={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
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
                    {member.userName} - {ROLE_LABELS[member.role] || member.role}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Playlist
            videos={playlist}
            videoTitles={videoTitles}
            currentVideoId={currentVideoId}
            canSelectVideo={canSelectVideo}
            controllerName={directorName}
            onAdd={handleSelectVideo}
            onSelect={handleSelectVideo}
          />

          {canManageRoles && (
            <div className="card role-manager">
              <div className="role-manager-header">
                <div>
                  <h2>Roles</h2>
                  <p className="muted small">
                    Tous les participants gardent le chat. La lecture et le changement de video sont assignes
                    separement.
                  </p>
                </div>
                <div className="role-chip role-chip-control">Acces directeur</div>
              </div>

              <div className="role-manager-list">
                {participants.map((member) => {
                  const isDirector = member.role === 'director';
                  const isCurrentUser = member.socketId && member.userName === user;

                  return (
                    <div key={`role-${member.socketId}`} className="role-manager-row">
                      <div>
                        <div className="role-manager-name">
                          {member.userName}
                          {isCurrentUser ? ' (vous)' : ''}
                        </div>
                        <p className="muted small">
                          {ROLE_DESCRIPTIONS[member.role] || ROLE_DESCRIPTIONS.participant}
                        </p>
                      </div>

                      {isDirector ? (
                        <div className="role-manager-badge">{ROLE_LABELS[member.role]}</div>
                      ) : (
                        <select
                          className="role-manager-select"
                          value={member.role}
                          onChange={(event) => handleRoleChange(member.socketId, event.target.value)}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="room-chat">
          <Chat user={user} messages={messages} onSend={sendChatMessage} title="Live Chat" />
        </div>
      </div>
    </div>
  );
}
