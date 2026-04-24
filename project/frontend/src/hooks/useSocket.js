import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { getRolePermissions } from '../utils/roomRoles';

const SOCKET_URL = 'http://localhost:4000';

export default function useSocket({ roomId, user, userId = null, controllerToken = null }) {
  const initialRole = controllerToken ? 'director' : 'participant';
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [roomState, setRoomState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [role, setRole] = useState(() => initialRole);
  const [permissions, setPermissions] = useState(() => getRolePermissions(initialRole));
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

    socket.on('role_assigned', ({ role: assignedRole, permissions: nextPermissions }) => {
      const resolvedRole = assignedRole || 'participant';
      setRole(resolvedRole);
      setPermissions(nextPermissions || getRolePermissions(resolvedRole));
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

    socket.on('room_reaction', (reaction) => {
      if (!reaction?.emoji) return;
      const reactionId = reaction.id || `${reaction.emoji}-${Date.now()}-${Math.random()}`;
      setReactions((prev) => [
        ...prev,
        {
          ...reaction,
          id: reactionId,
          left: 18 + Math.random() * 64
        }
      ]);

      window.setTimeout(() => {
        setReactions((prev) => prev.filter((item) => item.id !== reactionId));
      }, 2600);
    });

    socket.emit('join_room', {
      roomId,
      user,
      userId,
      controllerToken
    });

    return () => {
      setSocketConnected(false);
      setRole(initialRole);
      setPermissions(getRolePermissions(initialRole));
      setReactions([]);
      socket.disconnect();
    };
  }, [roomId, user, userId, controllerToken, initialRole]);

  const sendVideoCommand = (eventName, payload = {}) => {
    if (!socketRef.current) return;
    socketRef.current.emit(eventName, payload);
  };

  const sendChatMessage = (text) => {
    if (!socketRef.current || !text) return;
    socketRef.current.emit('chat_message', { text });
  };

  const sendReaction = (emoji) => {
    if (!socketRef.current || !emoji) return;
    socketRef.current.emit('room_reaction', { emoji });
  };

  const assignRole = (targetSocketId, nextRole) => {
    if (!socketRef.current || !targetSocketId || !nextRole) return;
    socketRef.current.emit('assign_role', {
      targetSocketId,
      role: nextRole
    });
  };

  return {
    socketConnected,
    roomState,
    messages,
    reactions,
    role,
    permissions,
    canControlVideo: permissions.canControlPlayback || permissions.canSelectVideo,
    canControlPlayback: permissions.canControlPlayback,
    canSelectVideo: permissions.canSelectVideo,
    canManageRoles: permissions.canManageRoles,
    permissionError,
    roomError,
    clearPermissionError: () => setPermissionError(null),
    sendVideoCommand,
    sendChatMessage,
    sendReaction,
    assignRole
  };
}
