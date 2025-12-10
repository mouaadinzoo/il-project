// Simple room-scoped chat relay.
module.exports = (io, socket) => {
  socket.on('chat_message', ({ roomId, user, text }) => {
    if (!roomId || !text) return;
    const message = { roomId, user: user || 'Guest', text, timestamp: Date.now() };
    io.to(roomId).emit('chat_message', message);
  });
};
