export const ROOM_ROLES = {
  DIRECTOR: 'director',
  MODERATOR: 'moderator',
  VIDEO_MANAGER: 'video_manager',
  PARTICIPANT: 'participant'
};

export const ROLE_LABELS = {
  [ROOM_ROLES.DIRECTOR]: 'Realisateur',
  [ROOM_ROLES.MODERATOR]: 'Moderateur lecture',
  [ROOM_ROLES.VIDEO_MANAGER]: 'Responsable video',
  [ROOM_ROLES.PARTICIPANT]: 'Participant'
};

export const ROLE_DESCRIPTIONS = {
  [ROOM_ROLES.DIRECTOR]: 'Gere les roles, la lecture synchronisee et le choix de la video.',
  [ROOM_ROLES.MODERATOR]: 'Peut lancer, mettre en pause, revenir au debut et avancer la lecture.',
  [ROOM_ROLES.VIDEO_MANAGER]: 'Peut changer la video diffusee pour tout le salon.',
  [ROOM_ROLES.PARTICIPANT]: 'Suit la regie synchronisee et garde l acces au chat.'
};

export const ROLE_OPTIONS = [
  { value: ROOM_ROLES.PARTICIPANT, label: ROLE_LABELS[ROOM_ROLES.PARTICIPANT] },
  { value: ROOM_ROLES.MODERATOR, label: ROLE_LABELS[ROOM_ROLES.MODERATOR] },
  { value: ROOM_ROLES.VIDEO_MANAGER, label: ROLE_LABELS[ROOM_ROLES.VIDEO_MANAGER] }
];

export function getRolePermissions(role) {
  switch (role) {
    case ROOM_ROLES.DIRECTOR:
      return {
        canControlPlayback: true,
        canSelectVideo: true,
        canManageRoles: true,
        canChat: true
      };
    case ROOM_ROLES.MODERATOR:
      return {
        canControlPlayback: true,
        canSelectVideo: false,
        canManageRoles: false,
        canChat: true
      };
    case ROOM_ROLES.VIDEO_MANAGER:
      return {
        canControlPlayback: false,
        canSelectVideo: true,
        canManageRoles: false,
        canChat: true
      };
    default:
      return {
        canControlPlayback: false,
        canSelectVideo: false,
        canManageRoles: false,
        canChat: true
      };
  }
}

export function getRoleHint(role) {
  const permissions = getRolePermissions(role);

  if (permissions.canManageRoles) {
    return 'Vous gerez les roles, la lecture synchronisee et la selection de la video.';
  }

  if (permissions.canControlPlayback) {
    return 'Vous pouvez lancer, mettre en pause, relancer et avancer la lecture. Le changement de video reste separe.';
  }

  if (permissions.canSelectVideo) {
    return 'Vous pouvez changer la video On-Air. La lecture, la pause et le seek restent limites a la regie playback.';
  }

  return 'Vous suivez automatiquement la regie. Le chat reste disponible.';
}
