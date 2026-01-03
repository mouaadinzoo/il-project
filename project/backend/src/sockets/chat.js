// Simple room-scoped chat relay.
const { recordMessage } = require('../utils/roomsStore');

module.exports = (io, socket) => {
  socket.on('chat_message', ({ roomId, user, text }) => {
    if (!roomId || !text) return;
    const message = { roomId, user: user || 'Guest', text, timestamp: Date.now() };
    recordMessage(roomId, null, message.user, text);
    io.to(roomId).emit('chat_message', message);
  });
};
