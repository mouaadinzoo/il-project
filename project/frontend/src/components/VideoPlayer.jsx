import { useEffect, useRef } from 'react';
import YouTube from 'react-youtube';

// YouTube player with local -> socket and socket -> local sync handling.
export default function VideoPlayer({ videoId, remoteSync, onAction, onVideoIdChange }) {
  const playerRef = useRef(null);
  const ignoreNext = useRef(false);

  const opts = {
    width: '100%',
    playerVars: { autoplay: 0 }
  };

  const handleReady = (event) => {
    playerRef.current = event.target;
  };

  const handleStateChange = (event) => {
    if (!playerRef.current) return;
    if (ignoreNext.current) {
      ignoreNext.current = false;
      return;
    }
    const currentTime = event.target.getCurrentTime();
    if (event.data === 1) onAction('play', currentTime, videoId); // playing
    if (event.data === 2) onAction('pause', currentTime, videoId); // paused
  };

  // Apply remote sync actions to the player.
  useEffect(() => {
    if (!remoteSync || !playerRef.current) return;
    const player = playerRef.current;
    ignoreNext.current = true; // avoid echo

    if (remoteSync.videoId && remoteSync.videoId !== videoId) {
      onVideoIdChange(remoteSync.videoId);
      return;
    }

    if (remoteSync.action === 'seek') {
      player.seekTo(remoteSync.time || 0, true);
    }
    if (remoteSync.action === 'play') {
      player.seekTo(remoteSync.time || 0, true);
      player.playVideo();
    }
    if (remoteSync.action === 'pause') {
      player.seekTo(remoteSync.time || player.getCurrentTime(), true);
      player.pauseVideo();
    }
  }, [remoteSync, videoId, onVideoIdChange]);

  return (
    <div className="card">
      <h2>Video</h2>
      <YouTube videoId={videoId} opts={opts} onReady={handleReady} onStateChange={handleStateChange} />
    </div>
  );
}
