// Handles play/pause/seek/change_video sync messages.
const { getRoom, recordVideo, updateRoomState } = require('../utils/roomsStore');

module.exports = (io, socket) => {
  socket.on('video_action', ({ action, time = 0, videoId }) => {
    const { roomId, user, hostSecret } = socket.data || {};
    if (!roomId || !action) return;

    const room = getRoom(roomId);
    if (!room) return;

    // Only the host can update the shared playback state.
    const socketIsHost =
      (room.hostSocketId && socket.id === room.hostSocketId) ||
      (hostSecret && hostSecret === room.hostSecret);
    if (!socketIsHost) {
      socket.emit('video_action_denied', { reason: 'host_only' });
      return;
    }

    const nextVideoId = videoId || room.videoState.videoId;
    room.videoState = { action, time, videoId: nextVideoId };
    updateRoomState(roomId, action, time, nextVideoId);
    recordVideo(roomId, nextVideoId);

    const payload = {
      roomId,
      user: room.host || user || 'Guest',
      action,
      time,
      videoId: nextVideoId,
      fromHost: true
    };
    io.to(roomId).emit('video_action', payload); // broadcast to everyone in the room
  });
};
