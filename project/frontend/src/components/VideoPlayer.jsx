import { useEffect, useRef, useCallback } from 'react';
import YouTube from 'react-youtube';

// Watch-together YouTube player:
// - HOST is the only one who emits global sync events (play/pause/seek + videoId changes)
// - VIEWERS never emit global sync events; their local controls only affect themselves
// - All clients apply server "remoteSync" via ROOM_SYNC-like payloads
export default function VideoPlayer({
  videoId,
  remoteSync, // { action: 'play'|'pause'|'seek'|'video', time?: number, videoId?: string }
  onAction, // (action, time, videoId) => void
  onVideoIdChange, // (newVideoId) => void
  isHost
}) {
  const playerRef = useRef(null);

  // Instead of "ignoreNext once", use a short lock window to swallow multiple YT state transitions.
  const ignoreUntilMsRef = useRef(0);
  const ignoreFor = useCallback((ms) => {
    ignoreUntilMsRef.current = Date.now() + ms;
  }, []);
  const isIgnoring = useCallback(() => Date.now() < ignoreUntilMsRef.current, []);

  // Optional: keep last emitted action+time to reduce spam (YT can fire state changes multiple times)
  const lastEmitRef = useRef({ action: null, tBucket: null, vid: null });

  const opts = {
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: isHost ? 1 : 0, // viewers cannot interact with controls
      disablekb: isHost ? 0 : 1
    }
  };

  const handleReady = (event) => {
    playerRef.current = event.target;
  };

  const emitHostAction = useCallback(
    async (action) => {
      if (!playerRef.current) return;
      if (!isHost) return;

      const t = await playerRef.current.getCurrentTime?.();
      const time = typeof t === 'number' && Number.isFinite(t) ? t : 0;

      // de-dupe: bucket time to ~250ms and same action/video
      const tBucket = Math.round(time * 4) / 4;
      const last = lastEmitRef.current;
      if (last.action === action && last.tBucket === tBucket && last.vid === videoId) return;

      lastEmitRef.current = { action, tBucket, vid: videoId };
      onAction(action, time, videoId);
    },
    [isHost, onAction, videoId]
  );

  // When the local player changes state:
  // - If we're currently applying a remote sync, ignore
  // - If VIEWER, do not emit anything
  // - If HOST, emit play/pause
  const handleStateChange = (event) => {
    if (!playerRef.current) return;
    if (isIgnoring()) return;

    // Only host controls global state
    if (!isHost) return;

    // YT state codes:
    // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (event.data === 1) emitHostAction('play');
    if (event.data === 2) emitHostAction('pause');
  };

  // Apply remote sync actions (from server) to the player.
  // IMPORTANT:
  // - This is the only place viewers get synchronized.
  // - Viewers can still play/pause locally, but that does NOT emit to server.
  useEffect(() => {
    const player = playerRef.current;
    if (!remoteSync || !player) return;

    // If remote sync changes videoId, update it and exit.
    // The parent component should re-render YouTube with new videoId.
    if (remoteSync.videoId && remoteSync.videoId !== videoId) {
      // Prevent echo/extra state changes while switching video
      ignoreFor(800);
      onVideoIdChange(remoteSync.videoId);
      return;
    }

    // Swallow the burst of YT state changes triggered by seek/play/pause.
    // 400-600ms is usually enough.
    ignoreFor(600);

    const safeTime =
      Number.isFinite(remoteSync.time) && typeof remoteSync.time === 'number' ? remoteSync.time : null;

    if (remoteSync.action === 'seek') {
      player.seekTo(safeTime ?? 0, true);
      return;
    }

    if (remoteSync.action === 'play') {
      if (safeTime !== null) player.seekTo(safeTime, true);
      player.playVideo();
      return;
    }

    if (remoteSync.action === 'pause') {
      // Prefer: seek first (if provided), then pause ONCE.
      if (safeTime !== null) player.seekTo(safeTime, true);
      player.pauseVideo();
      return;
    }

    // Optional: if you send a "video" action explicitly
    if (remoteSync.action === 'video') {
      if (remoteSync.videoId && remoteSync.videoId !== videoId) {
        ignoreFor(800);
        onVideoIdChange(remoteSync.videoId);
      }
    }
  }, [remoteSync, videoId, onVideoIdChange, ignoreFor]);

  return (
    <div className="card">
      <h2>Video</h2>
      <div style={{ position: 'relative' }}>
        <YouTube videoId={videoId} opts={opts} onReady={handleReady} onStateChange={handleStateChange} />
        {!isHost && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              cursor: 'not-allowed'
            }}
          />
        )}
      </div>
      {!isHost && (
        <p style={{ marginTop: 8, opacity: 0.75 }}>
          Viewer mode: your play/pause/seek are local only. Only the host syncs everyone.
        </p>
      )}
    </div>
  );
}
