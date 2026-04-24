const { recordMessage } = require('../utils/roomsStore');

module.exports = (io, socket) => {
  socket.on('chat_message', ({ text } = {}) => {
    const roomId = socket.data?.roomId;
    const userId = socket.data?.userId || null;
    const userName = socket.data?.userName || 'Guest';
    const role = socket.data?.role || 'participant';
    const content = String(text || '').trim();

    if (!roomId || !content) return;

    const message = {
      roomId,
      user: userName,
      role,
      text: content,
      timestamp: Date.now()
    };

    recordMessage(roomId, userId, userName, content);
    io.to(roomId).emit('chat_message', message);
  });

  socket.on('room_reaction', ({ emoji } = {}) => {
    const roomId = socket.data?.roomId;
    const userName = socket.data?.userName || 'Guest';
    const role = socket.data?.role || 'participant';
    const allowedReactions = new Set(['❤️', '😂', '🔥', '👏']);
    const selectedEmoji = String(emoji || '').trim();

    if (!roomId || !allowedReactions.has(selectedEmoji)) return;

    io.to(roomId).emit('room_reaction', {
      id: `${socket.id}-${Date.now()}`,
      emoji: selectedEmoji,
      user: userName,
      role,
      timestamp: Date.now()
    });
  });
};
