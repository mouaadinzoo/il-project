// Connects socket handlers on new socket connections.
const videoSyncHandler = require('./videoSync');
const chatHandler = require('./chat');

module.exports = (io) => {
  io.on('connection', (socket) => {
    // Room join handshake to scope later events.
    socket.on('join_room', ({ roomId, user }) => {
      if (!roomId) return;
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.user = user || 'Guest';
      socket.emit('joined_room', { roomId });
      socket.to(roomId).emit('user_joined', { user: socket.data.user });
    });

    videoSyncHandler(io, socket);
    chatHandler(io, socket);

    socket.on('disconnect', () => {
      const { roomId, user } = socket.data;
      if (roomId) socket.to(roomId).emit('user_left', { user: user || 'Guest' });
    });
  });
};
