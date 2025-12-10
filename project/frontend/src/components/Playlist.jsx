import { useState } from 'react';

// Simple playlist manager; accepts YouTube URL or ID.
export default function Playlist({ videos, onAdd, onSelect, currentVideoId }) {
  const [input, setInput] = useState('');

  const parseVideoId = (value) => {
    const match = value.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
    return match ? match[1] : value.trim();
  };

  const handleAdd = () => {
    if (!input.trim()) return;
    const id = parseVideoId(input);
    onAdd(id);
    setInput('');
  };

  return (
    <div className="card">
      <h2>Playlist</h2>
      <div className="row">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="YouTube URL or ID" />
        <button onClick={handleAdd}>Add</button>
      </div>
      <ul className="playlist">
        {videos.map((vid) => (
          <li key={vid} className={vid === currentVideoId ? 'active' : ''} onClick={() => onSelect(vid)}>
            {vid}
          </li>
        ))}
      </ul>
    </div>
  );
}
