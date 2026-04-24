const ROOM_ROLES = {
  DIRECTOR: 'director',
  MODERATOR: 'moderator',
  VIDEO_MANAGER: 'video_manager',
  PARTICIPANT: 'participant'
};

const CONTROLLED_EVENTS = new Set(['play_video', 'pause_video', 'seek_video', 'select_video']);
const MANAGED_EVENTS = new Set(['assign_role']);
const ASSIGNABLE_ROLES = new Set([
  ROOM_ROLES.MODERATOR,
  ROOM_ROLES.VIDEO_MANAGER,
  ROOM_ROLES.PARTICIPANT
]);
const ACTION_ROLE_MATRIX = {
  play_video: new Set([ROOM_ROLES.DIRECTOR, ROOM_ROLES.MODERATOR]),
  pause_video: new Set([ROOM_ROLES.DIRECTOR, ROOM_ROLES.MODERATOR]),
  seek_video: new Set([ROOM_ROLES.DIRECTOR, ROOM_ROLES.MODERATOR]),
  select_video: new Set([ROOM_ROLES.DIRECTOR, ROOM_ROLES.VIDEO_MANAGER]),
  assign_role: new Set([ROOM_ROLES.DIRECTOR])
};
const DEFAULT_ROLE = ROOM_ROLES.PARTICIPANT;

function resolveActorKey(userId, userName) {
  if (userId) return `user:${userId}`;
  return `name:${String(userName || 'guest').trim().toLowerCase()}`;
}

function resolveRoomRole(room, actor = {}) {
  if (!room) return DEFAULT_ROLE;

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
  const assignedRole = room.roleAssignments?.get(actorKey);
  if (assignedRole) {
    return assignedRole;
  }

  return DEFAULT_ROLE;
}

function canControlRoom(role) {
  const permissions = getRolePermissions(role);
  return permissions.canControlPlayback || permissions.canSelectVideo;
}

function canControlAction(role, action) {
  const allowedRoles = ACTION_ROLE_MATRIX[action];
  if (!allowedRoles) return false;
  return allowedRoles.has(role || DEFAULT_ROLE);
}

function isAssignableRole(role) {
  return ASSIGNABLE_ROLES.has(role);
}

function getRolePermissions(role) {
  return {
    canControlPlayback:
      canControlAction(role, 'play_video') ||
      canControlAction(role, 'pause_video') ||
      canControlAction(role, 'seek_video'),
    canSelectVideo: canControlAction(role, 'select_video'),
    canManageRoles: canControlAction(role, 'assign_role'),
    canChat: true
  };
}

function buildPermissionDeniedPayload(action, role) {
  const requiredRoles = Array.from(ACTION_ROLE_MATRIX[action] || []);
  const defaultMessageByAction = {
    play_video: 'Only the director or moderator can control playback.',
    pause_video: 'Only the director or moderator can control playback.',
    seek_video: 'Only the director or moderator can control playback.',
    select_video: 'Only the director or video manager can change the shared video.',
    assign_role: 'Only the director can change room roles.'
  };

  return {
    action,
    role,
    requiredRole: requiredRoles[0] || ROOM_ROLES.DIRECTOR,
    requiredRoles,
    reason: 'forbidden',
    message: defaultMessageByAction[action] || 'You do not have permission for this action.'
  };
}

module.exports = {
  ROOM_ROLES,
  CONTROLLED_EVENTS,
  MANAGED_EVENTS,
  DEFAULT_ROLE,
  ASSIGNABLE_ROLES,
  resolveActorKey,
  resolveRoomRole,
  canControlRoom,
  canControlAction,
  isAssignableRole,
  getRolePermissions,
  buildPermissionDeniedPayload
};
