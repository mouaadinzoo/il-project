import { useState } from 'react';

function parseVideoId(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const match = trimmed.match(/(?:v=|youtu\.be\/|embed\/)([^&?/]+)/);
  return match ? match[1] : trimmed;
}

export default function Playlist({
  videos,
  onAdd,
  onSelect,
  currentVideoId,
  canControl,
  controllerName
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!canControl || !input.trim()) return;
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
            {canControl
              ? 'Ajouter une video la met immediatement On-Air.'
              : `${controllerName || 'Le realisateur'} est le seul a pouvoir changer la video globale.`}
          </p>
        </div>
        <div className={`role-chip ${canControl ? 'role-chip-control' : 'role-chip-follow'}`}>
          {canControl ? 'Controle actif' : 'Lecture seule'}
        </div>
      </div>

      <div className="row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="YouTube URL or ID"
          disabled={!canControl}
        />
        <button onClick={handleAdd} disabled={!canControl}>
          Set On-Air
        </button>
      </div>

      <ul className="playlist">
        {videos.map((video) => (
          <li key={video} className={video === currentVideoId ? 'active' : ''}>
            <button
              type="button"
              className="playlist-item-btn"
              disabled={!canControl}
              onClick={() => onSelect(video)}
            >
              <span>{video}</span>
              {video === currentVideoId && <span className="playlist-tag">On-Air</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
