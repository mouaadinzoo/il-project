const ROOM_ROLES = {
  DIRECTOR: 'director',
  MODERATOR: 'moderator',
  PARTICIPANT: 'participant'
};

const CONTROLLED_EVENTS = new Set(['play_video', 'pause_video', 'seek_video', 'select_video']);

function resolveActorKey(userId, userName) {
  if (userId) return `user:${userId}`;
  return `name:${String(userName || 'guest').trim().toLowerCase()}`;
}

function resolveRoomRole(room, actor = {}) {
  if (!room) return ROOM_ROLES.PARTICIPANT;

  const directorBySecret =
    Boolean(actor.controllerToken) && actor.controllerToken === room.directorSecret;
  if (directorBySecret) {
    return ROOM_ROLES.DIRECTOR;
  }

  const directorByUserId =
    Boolean(room.directorUserId) &&
    Boolean(actor.userId) &&
    Number(actor.userId) === Number(room.directorUserId);
  if (directorByUserId) {
    return ROOM_ROLES.DIRECTOR;
  }

  const actorKey = resolveActorKey(actor.userId, actor.userName);
  if (room.moderators.has(actorKey)) {
    return ROOM_ROLES.MODERATOR;
  }

  return ROOM_ROLES.PARTICIPANT;
}

function canControlRoom(role) {
  return role === ROOM_ROLES.DIRECTOR;
}

function buildPermissionDeniedPayload(action, role) {
  return {
    action,
    role,
    requiredRole: ROOM_ROLES.DIRECTOR,
    reason: 'forbidden',
    message: 'Only the director can control the shared video.'
  };
}

module.exports = {
  ROOM_ROLES,
  CONTROLLED_EVENTS,
  resolveActorKey,
  resolveRoomRole,
  canControlRoom,
  buildPermissionDeniedPayload
};
