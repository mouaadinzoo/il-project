const videoSyncHandler = require('./videoSync');
const chatHandler = require('./chat');
const {
  rooms,
  getRoom,
  getRecentMessages,
  getRoomSnapshot,
  addConnectedUser,
  removeConnectedUser
} = require('../utils/roomsStore');
const {
  resolveRoomRole,
  canControlRoom
} = require('../utils/roomPermissions');

const SNAPSHOT_INTERVAL_MS = 5000;

module.exports = (io) => {
  setInterval(() => {
    rooms.forEach((room) => {
      if (!room.connectedUsers.size) return;
      io.to(room.id).emit('room_state', getRoomSnapshot(room));
    });
  }, SNAPSHOT_INTERVAL_MS);

  io.on('connection', (socket) => {
    socket.on('join_room', ({ roomId, user, controllerToken, hostSecret, userId }) => {
      if (!roomId) return;

      const room = getRoom(roomId);
      if (!room) {
        socket.emit('room_error', { error: 'Room not found' });
        return;
      }

      const userName = String(user || 'Guest').trim() || 'Guest';
      const effectiveControllerToken = controllerToken || hostSecret || null;
      const role = resolveRoomRole(room, {
        controllerToken: effectiveControllerToken,
        userId: userId || null,
        userName
      });

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.userName = userName;
      socket.data.userId = userId || null;
      socket.data.controllerToken = effectiveControllerToken;
      socket.data.role = role;

      addConnectedUser(roomId, {
        socketId: socket.id,
        userId: socket.data.userId,
        userName,
        role
      });

      socket.emit('role_assigned', {
        role,
        directorName: room.directorName,
        permissions: {
          canControlVideo: canControlRoom(role)
        }
      });
      socket.emit('joined_room', { roomId, role });

      const history = getRecentMessages(roomId);
      if (history.length) {
        socket.emit('chat_history', history);
      }

      io.to(roomId).emit('room_state', getRoomSnapshot(roomId));
      socket.to(roomId).emit('user_joined', { user: userName, role });
    });

    videoSyncHandler(io, socket);
    chatHandler(io, socket);

    socket.on('disconnect', () => {
      const { roomId, userName } = socket.data || {};
      if (!roomId) return;

      const disconnectedMember = removeConnectedUser(roomId, socket.id);
      socket.to(roomId).emit('user_left', {
        user: disconnectedMember?.userName || userName || 'Guest'
      });

      const snapshot = getRoomSnapshot(roomId);
      if (snapshot) {
        io.to(roomId).emit('room_state', snapshot);
      }
    });
  });
};
