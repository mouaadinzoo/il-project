const { getRoom, applyRoomCommand } = require('../utils/roomsStore');
const {
  buildPermissionDeniedPayload,
  canControlAction,
  resolveRoomRole
} = require('../utils/roomPermissions');

function handleControlledCommand(io, socket, action, payload = {}) {
  const { roomId, userId, userName, controllerToken } = socket.data || {};
  if (!roomId) return;

  const room = getRoom(roomId);
  if (!room) {
    socket.emit('room_error', { error: 'Room not found' });
    return;
  }

  const role = resolveRoomRole(room, { userId, userName, controllerToken });
  socket.data.role = role;

  if (!canControlAction(role, action)) {
    socket.emit('permission_denied', buildPermissionDeniedPayload(action, role));
    return;
  }

  try {
    const nextState = applyRoomCommand(
      roomId,
      action,
      {
        time: payload.time,
        videoId: payload.videoId
      },
      {
        userId: userId || null,
        userName: userName || 'Guest',
        role
      }
    );

    io.to(roomId).emit('state_changed', {
      type: action,
      actor: {
        userId: userId || null,
        userName: userName || 'Guest',
        role
      },
      state: nextState
    });
  } catch (err) {
    socket.emit('room_error', { error: err.message || 'Unable to update room state.' });
  }
}

module.exports = (io, socket) => {
  socket.on('play_video', (payload = {}) => {
    handleControlledCommand(io, socket, 'play_video', payload);
  });

  socket.on('pause_video', (payload = {}) => {
    handleControlledCommand(io, socket, 'pause_video', payload);
  });

  socket.on('seek_video', (payload = {}) => {
    handleControlledCommand(io, socket, 'seek_video', payload);
  });

  socket.on('select_video', (payload = {}) => {
    handleControlledCommand(io, socket, 'select_video', payload);
  });

  socket.on('video_action', ({ action, time, videoId } = {}) => {
    const actionMap = {
      play: 'play_video',
      pause: 'pause_video',
      seek: 'seek_video',
      change_video: 'select_video',
      video: 'select_video'
    };

    const mappedAction = actionMap[action];
    if (!mappedAction) return;
    handleControlledCommand(io, socket, mappedAction, { time, videoId });
  });
};
