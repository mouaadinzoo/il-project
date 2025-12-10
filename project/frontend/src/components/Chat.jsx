import { useEffect, useRef, useState } from 'react';

// Chat pane synced via socket events.
export default function Chat({ user, messages, onSend, title = 'Chat' }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <span className="chat-icon">💬</span>
        <h3>{title}</h3>
      </div>
      <div className="chat-messages" ref={listRef}>
        {messages.map((msg, idx) => (
          <div key={`${msg.timestamp}-${idx}`} className="chat-message">
            <div className="chat-avatar">{(msg.user || 'G')[0]}</div>
            <div className="chat-bubble">
              <div className="chat-meta">
                <span className="chat-name">{msg.user || 'Guest'}</span>
                <span className="chat-time">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
              <div className="chat-text">{msg.text}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
        />
        <button className="pill primary" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}
