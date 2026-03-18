const { recordMessage } = require('../utils/roomsStore');

module.exports = (io, socket) => {
  socket.on('chat_message', ({ text } = {}) => {
    const roomId = socket.data?.roomId;
    const userId = socket.data?.userId || null;
    const userName = socket.data?.userName || 'Guest';
    const content = String(text || '').trim();

    if (!roomId || !content) return;

    const message = {
      roomId,
      user: userName,
      text: content,
      timestamp: Date.now()
    };

    recordMessage(roomId, userId, userName, content);
    io.to(roomId).emit('chat_message', message);
  });
};
