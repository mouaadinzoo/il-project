import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';

// Manages socket connection + exposes helpers for video + chat.
export default function useSocket({ roomId, user }) {
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [remoteSync, setRemoteSync] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!roomId) return;
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.emit('join_room', { roomId, user });

    socket.on('video_action', (payload) => setRemoteSync(payload));
    socket.on('chat_message', (message) => setMessages((prev) => [...prev, message]));

    return () => {
      socket.disconnect();
    };
  }, [roomId, user]);

  const sendVideoAction = (action, time, videoId) => {
    if (!socketRef.current) return;
    socketRef.current.emit('video_action', { roomId, user, action, time, videoId });
  };

  const sendChatMessage = (text) => {
    if (!socketRef.current || !text) return;
    socketRef.current.emit('chat_message', { roomId, user, text });
  };

  return { socketConnected, remoteSync, messages, sendVideoAction, sendChatMessage };
}
