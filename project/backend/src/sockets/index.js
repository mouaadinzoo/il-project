// Connects socket handlers on new socket connections.
const videoSyncHandler = require('./videoSync');
const chatHandler = require('./chat');
const { getRoom, getRecentMessages } = require('../utils/roomsStore');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Room join handshake to scope later events.
    socket.on('join_room', ({ roomId, user, hostSecret }) => {
      if (!roomId) return;
      const room = getRoom(roomId);
      if (!room) {
        socket.emit('room_error', { error: 'Room not found' });
        return;
      }

      // If the named user is the recorded host but no secret was provided (e.g., refresh), reuse the room secret.
      const effectiveSecret = hostSecret || (user === room.host ? room.hostSecret : undefined);

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.user = user || 'Guest';
      socket.data.hostSecret = effectiveSecret;
      const claimedHost = Boolean(effectiveSecret && effectiveSecret === room.hostSecret);
      const nameMatchesHost = user === room.host;
      if (claimedHost || nameMatchesHost) {
        room.hostSocketId = socket.id; // allow reclaim on reconnect
      }

      socket.data.isHost = socket.id === room.hostSocketId;
      socket.emit('role_assigned', { isHost: socket.data.isHost, host: room.host });
      socket.emit('joined_room', { roomId });
      socket.to(roomId).emit('user_joined', { user: socket.data.user });

      const history = getRecentMessages(roomId);
      if (history.length) {
        socket.emit('chat_history', history);
      }

      // Send current host-driven playback state to the newly joined client.
      if (room.videoState) {
        const { action, time, videoId } = room.videoState;
        socket.emit('video_action', {
          roomId,
          user: room.host,
          action,
          time,
          videoId,
          fromHost: true
        });
      }
    });

    videoSyncHandler(io, socket);
    chatHandler(io, socket);

    socket.on('disconnect', () => {
      const { roomId, user } = socket.data;
      if (roomId) {
        const room = getRoom(roomId);
        if (room && room.hostSocketId === socket.id) {
          room.hostSocketId = null; // allow host to reclaim if they reconnect
        }
        socket.to(roomId).emit('user_left', { user: user || 'Guest' });
      }
    });
  });
};
