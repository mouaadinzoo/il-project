import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:4000';

export default function useSocket({ roomId, user, userId = null, controllerToken = null }) {
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [role, setRole] = useState(() => (controllerToken ? 'director' : 'participant'));
  const [permissionError, setPermissionError] = useState(null);
  const [roomError, setRoomError] = useState(null);

  useEffect(() => {
    if (!permissionError) return undefined;
    const timeoutId = window.setTimeout(() => setPermissionError(null), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [permissionError]);

  useEffect(() => {
    if (!roomId) return undefined;

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      withCredentials: true
    });

    socketRef.current = socket;
    setMessages([]);
    setRoomError(null);

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('role_assigned', ({ role: assignedRole }) => {
      setRole(assignedRole || 'participant');
    });

    socket.on('room_state', (snapshot) => {
      setRoomState(snapshot);
    });

    socket.on('state_changed', ({ state }) => {
      if (state) setRoomState(state);
    });

    socket.on('permission_denied', (payload) => {
      setPermissionError(payload);
    });

    socket.on('room_error', (payload) => {
      setRoomError(payload?.error || 'Unexpected room error.');
    });

    socket.on('chat_history', (history) => {
      if (Array.isArray(history)) setMessages(history);
    });

    socket.on('chat_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.emit('join_room', {
      roomId,
      user,
      userId,
      controllerToken
    });

    return () => {
      setSocketConnected(false);
      setRole(controllerToken ? 'director' : 'participant');
      socket.disconnect();
    };
  }, [roomId, user, userId, controllerToken]);

  const sendVideoCommand = (eventName, payload = {}) => {
    if (!socketRef.current) return;
    socketRef.current.emit(eventName, payload);
  };

  const sendChatMessage = (text) => {
    if (!socketRef.current || !text) return;
    socketRef.current.emit('chat_message', { text });
  };

  return {
    socketConnected,
    roomState,
    messages,
    role,
    canControlVideo: role === 'director',
    permissionError,
    roomError,
    clearPermissionError: () => setPermissionError(null),
    sendVideoCommand,
    sendChatMessage
  };
}
