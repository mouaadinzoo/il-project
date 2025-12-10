// Handles play/pause/seek/change_video sync messages.
const { getRoom } = require('../utils/roomsStore');

module.exports = (io, socket) => {
  socket.on('video_action', ({ roomId, user, action, time = 0, videoId }) => {
    if (!roomId || !action) return;
    const room = getRoom(roomId);
    if (room) {
      // Persist minimal state in memory for newcomers (optional usage).
      room.videoState = { action, time, videoId: videoId || room.videoState.videoId };
    }
    const payload = { roomId, user: user || 'Guest', action, time, videoId };
    io.to(roomId).emit('video_action', payload); // broadcast to everyone in the room
  });
};
