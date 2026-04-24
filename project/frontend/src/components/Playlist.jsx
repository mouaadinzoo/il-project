import { useState } from 'react';

function parseVideoId(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
  return match ? match[1] : trimmed;
}

export default function Playlist({
  videos,
  videoTitles = {},
  onAdd,
  onSelect,
  currentVideoId,
  canSelectVideo,
  controllerName
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!canSelectVideo || !input.trim()) return;
    const nextVideoId = parseVideoId(input);
    if (!nextVideoId) return;
    onAdd(nextVideoId);
    setInput('');
  };

  return (
    <div className="card">
      <div className="playlist-header">
        <div>
          <h2>Playlist</h2>
          <p className="muted small">
            {canSelectVideo
              ? 'Ajouter une video la met immediatement On-Air.'
              : `${controllerName || 'La regie'} gere le changement de video globale.`}
          </p>
        </div>
        <div className={`role-chip ${canSelectVideo ? 'role-chip-control' : 'role-chip-follow'}`}>
          {canSelectVideo ? 'Selection video' : 'Lecture seule'}
        </div>
      </div>

      <div className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="YouTube URL or ID"
          disabled={!canSelectVideo}
        />
        <button onClick={handleAdd} disabled={!canSelectVideo}>
          Set On-Air
        </button>
      </div>

      <ul className="playlist">
        {videos.map((video) => {
          const title = videoTitles[video] || video;

          return (
            <li key={video} className={video === currentVideoId ? 'active' : ''}>
              <button
                type="button"
                className="playlist-item-btn"
                disabled={!canSelectVideo}
                onClick={() => onSelect(video)}
              >
                <span className="playlist-video-text">
                  <span className="playlist-video-title">{title}</span>
                  <span className="playlist-video-id">{video}</span>
                </span>
                {video === currentVideoId && <span className="playlist-tag">On-Air</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
