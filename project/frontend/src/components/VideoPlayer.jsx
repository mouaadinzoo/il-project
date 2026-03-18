import { useCallback, useEffect, useRef } from 'react';
import YouTube from 'react-youtube';

const PLAYER_STATES = {
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2
};

function safeTime(value) {
  return Number.isFinite(value) ? value : 0;
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(safeTime(totalSeconds)));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export default function VideoPlayer({ videoId, roomState, canControlVideo, onCommand }) {
  const playerRef = useRef(null);
  const ignoreUntilMsRef = useRef(0);
  const lastObservedRef = useRef({ time: 0, checkedAt: 0 });

  const ignoreFor = useCallback((ms) => {
    ignoreUntilMsRef.current = Date.now() + ms;
  }, []);

  const isIgnoring = useCallback(() => Date.now() < ignoreUntilMsRef.current, []);

  const readCurrentTime = useCallback(() => {
    const player = playerRef.current;
    if (!player) return 0;
    return safeTime(player.getCurrentTime?.());
  }, []);

  const sendCommand = useCallback(
    (type, payload = {}) => {
      if (!canControlVideo || !onCommand) return;
      onCommand(type, payload);
    },
    [canControlVideo, onCommand]
  );

  const opts = {
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: canControlVideo ? 1 : 0,
      disablekb: canControlVideo ? 0 : 1
    }
  };

  const handleReady = (event) => {
    playerRef.current = event.target;
    lastObservedRef.current = {
      time: safeTime(event.target.getCurrentTime?.()),
      checkedAt: Date.now()
    };
  };

  const handleStateChange = (event) => {
    if (!canControlVideo || isIgnoring()) return;

    const currentTime = readCurrentTime();
    if (event.data === PLAYER_STATES.PLAYING) {
      sendCommand('play_video', { time: currentTime });
    }

    if (event.data === PLAYER_STATES.PAUSED || event.data === PLAYER_STATES.ENDED) {
      sendCommand('pause_video', { time: currentTime });
    }
  };

  useEffect(() => {
    const player = playerRef.current;
    if (!player || !roomState) return;

    const targetTime = safeTime(roomState.currentTime);
    const currentTime = readCurrentTime();
    const drift = Math.abs(currentTime - targetTime);
    const playerState = player.getPlayerState?.();

    if (roomState.playbackStatus === 'playing') {
      if (drift > 1.25) {
        ignoreFor(700);
        player.seekTo(targetTime, true);
      }
      if (playerState !== PLAYER_STATES.PLAYING) {
        ignoreFor(700);
        player.playVideo();
      }
      return;
    }

    if (drift > 0.5) {
      ignoreFor(700);
      player.seekTo(targetTime, true);
    }
    if (playerState !== PLAYER_STATES.PAUSED) {
      ignoreFor(700);
      player.pauseVideo();
    }
  }, [
    roomState?.currentTime,
    roomState?.playbackStatus,
    roomState?.updatedAt,
    roomState?.currentVideoId,
    readCurrentTime,
    ignoreFor
  ]);

  useEffect(() => {
    if (!canControlVideo) return undefined;

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;
      if (!player || isIgnoring()) return;

      const playerState = player.getPlayerState?.();
      const currentTime = readCurrentTime();
      const now = Date.now();

      if (playerState !== PLAYER_STATES.PLAYING && playerState !== PLAYER_STATES.PAUSED) {
        lastObservedRef.current = { time: currentTime, checkedAt: now };
        return;
      }

      const lastObserved = lastObservedRef.current;
      const expectedTime =
        lastObserved.time +
        (playerState === PLAYER_STATES.PLAYING ? (now - lastObserved.checkedAt) / 1000 : 0);

      if (Math.abs(currentTime - expectedTime) > 2.5) {
        sendCommand('seek_video', { time: currentTime });
      }

      lastObservedRef.current = { time: currentTime, checkedAt: now };
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [canControlVideo, isIgnoring, readCurrentTime, sendCommand]);

  return (
    <div className="card video-card">
      <div className="video-card-header">
        <div>
          <h2>Video On-Air</h2>
          <p className="muted small">
            Statut: {roomState?.playbackStatus || 'paused'} · Temps: {formatTime(roomState?.currentTime)}
          </p>
        </div>
        <div className={`role-chip ${canControlVideo ? 'role-chip-control' : 'role-chip-follow'}`}>
          {canControlVideo ? 'Vous pilotez la regie' : 'Mode suivi'}
        </div>
      </div>

      <div className="video-player-shell">
        <YouTube videoId={videoId} opts={opts} onReady={handleReady} onStateChange={handleStateChange} />
        {!canControlVideo && <div className="video-guard" aria-hidden="true" />}
      </div>

      <div className="video-control-bar">
        <button disabled={!canControlVideo} onClick={() => sendCommand('play_video', { time: readCurrentTime() })}>
          Play
        </button>
        <button disabled={!canControlVideo} onClick={() => sendCommand('pause_video', { time: readCurrentTime() })}>
          Pause
        </button>
        <button
          disabled={!canControlVideo}
          onClick={() => sendCommand('seek_video', { time: Math.max(0, readCurrentTime() - 10) })}
        >
          -10s
        </button>
        <button disabled={!canControlVideo} onClick={() => sendCommand('seek_video', { time: readCurrentTime() + 10 })}>
          +10s
        </button>
      </div>

      <p className="video-note">
        {canControlVideo
          ? 'Play, pause, changement de video et seek sont valides par le serveur avant diffusion.'
          : 'La video suit le snapshot serveur. Les commandes globales sont reservees au realisateur.'}
      </p>
    </div>
  );
}
