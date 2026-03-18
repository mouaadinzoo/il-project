const crypto = require('crypto');
const { db } = require('../db');
const { ROOM_ROLES } = require('./roomPermissions');

const rooms = new Map();
const defaultVideoId = 'dQw4w9WgXcQ';
const MAX_AUDIT_LOG = 20;

const nowIso = () => new Date().toISOString();

function safeNumber(value, fallback = 0) {
  return Number.isFinite(value) ? value : fallback;
}

function roundTime(value) {
  return Number(safeNumber(value, 0).toFixed(3));
}

function normalizePlaybackStatus(value) {
  return value === 'play' || value === 'playing' ? 'playing' : 'paused';
}

function computeStartedAtMs(playbackStatus, currentTime, updatedAt) {
  if (playbackStatus !== 'playing') return null;
  const updatedAtMs = Date.parse(updatedAt);
  if (!Number.isFinite(updatedAtMs)) {
    return Date.now() - safeNumber(currentTime, 0) * 1000;
  }
  return updatedAtMs - safeNumber(currentTime, 0) * 1000;
}

function computeCurrentTime(state, atMs = Date.now()) {
  if (!state) return 0;
  if (state.playbackStatus !== 'playing' || !Number.isFinite(state.startedAtMs)) {
    return Math.max(0, safeNumber(state.currentTime, 0));
  }
  return Math.max(0, (atMs - state.startedAtMs) / 1000);
}

function clampTime(value) {
  return Math.max(0, roundTime(safeNumber(value, 0)));
}

function parseAuditMeta(meta) {
  if (!meta) return null;
  try {
    return JSON.parse(meta);
  } catch (_err) {
    return null;
  }
}

function mapAuditRow(row) {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    action: row.action,
    meta: parseAuditMeta(row.meta),
    createdAt: row.created_at
  };
}

function serializeRoomResponse(room, { includeControllerToken = false } = {}) {
  const response = {
    id: room.id,
    name: room.name,
    host: room.directorName,
    directorName: room.directorName,
    playlist: [...room.playlist],
    currentVideoId: room.state.currentVideoId,
    playbackStatus: room.state.playbackStatus
  };

  if (includeControllerToken) {
    response.controllerToken = room.directorSecret;
    response.hostSecret = room.directorSecret;
  }

  return response;
}

function hydratePlaylist(roomId, fallbackVideoId) {
  const rows = db
    .prepare(
      `SELECT video_id
       FROM videos
       WHERE room_id = ?
       ORDER BY id ASC`
    )
    .all(roomId);

  const playlist = rows.map((row) => row.video_id).filter(Boolean);
  if (!playlist.length && fallbackVideoId) {
    playlist.push(fallbackVideoId);
  }
  if (fallbackVideoId && !playlist.includes(fallbackVideoId)) {
    playlist.unshift(fallbackVideoId);
  }

  return playlist;
}

function hydrateAuditLog(roomId) {
  const rows = db
    .prepare(
      `SELECT id, actor_user_id, actor_name, actor_role, action, meta, created_at
       FROM room_audit_logs
       WHERE room_id = ?
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(roomId, MAX_AUDIT_LOG);

  return rows.map(mapAuditRow).reverse();
}

function buildRoom(roomRow, stateRow) {
  const currentVideoId = stateRow?.video_id || defaultVideoId;
  const playbackStatus = normalizePlaybackStatus(stateRow?.action);
  const updatedAt = stateRow?.updated_at || nowIso();
  const currentTime = clampTime(stateRow?.time);
  const playlist = hydratePlaylist(roomRow.id, currentVideoId);
  const auditLog = hydrateAuditLog(roomRow.id);
  const lastLog = auditLog[auditLog.length - 1];

  return {
    id: roomRow.id,
    name: roomRow.name,
    directorName: roomRow.host_name,
    directorUserId: roomRow.host_user_id || null,
    directorSecret: roomRow.host_secret,
    directorSocketId: null,
    moderators: new Set(),
    connectedUsers: new Map(),
    playlist,
    auditLog,
    state: {
      roomId: roomRow.id,
      currentVideoId,
      playbackStatus,
      currentTime,
      updatedAt,
      controllerRole: ROOM_ROLES.DIRECTOR,
      directorUserId: roomRow.host_user_id || null,
      lastAction: lastLog?.action || 'room_loaded',
      lastActorName: lastLog?.actorName || roomRow.host_name,
      startedAtMs: computeStartedAtMs(playbackStatus, currentTime, updatedAt)
    }
  };
}

function loadRoom(roomId) {
  const roomRow = db
    .prepare(
      `SELECT id, name, host_user_id, host_name, host_secret
       FROM rooms
       WHERE id = ?`
    )
    .get(roomId);
  if (!roomRow) return null;

  const stateRow = db
    .prepare(
      `SELECT action, time, video_id, updated_at
       FROM room_state
       WHERE room_id = ?`
    )
    .get(roomId);

  const room = buildRoom(roomRow, stateRow);
  rooms.set(roomId, room);
  return room;
}

function getRoom(roomId) {
  if (!roomId) return null;
  return rooms.get(roomId) || loadRoom(roomId);
}

function ensureRoomId() {
  for (let i = 0; i < 5; i += 1) {
    const id = crypto.randomBytes(3).toString('hex');
    const exists = db.prepare('SELECT 1 FROM rooms WHERE id = ?').get(id);
    if (!exists) return id;
  }
  throw new Error('Failed to generate room id');
}

function persistRoomState(room) {
  if (!room) return;
  db.prepare(
    `INSERT INTO room_state (room_id, action, time, video_id, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(room_id)
     DO UPDATE SET action = excluded.action,
                   time = excluded.time,
                   video_id = excluded.video_id,
                   updated_at = excluded.updated_at`
  ).run(
    room.id,
    room.state.playbackStatus,
    clampTime(room.state.currentTime),
    room.state.currentVideoId,
    room.state.updatedAt
  );
}

function appendAuditLog(roomOrRoomId, entry) {
  const room = typeof roomOrRoomId === 'string' ? getRoom(roomOrRoomId) : roomOrRoomId;
  if (!room || !entry?.action) return null;

  const createdAt = entry.createdAt || nowIso();
  const meta = entry.meta ? JSON.stringify(entry.meta) : null;
  const result = db
    .prepare(
      `INSERT INTO room_audit_logs (
        room_id,
        actor_user_id,
        actor_name,
        actor_role,
        action,
        meta,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      room.id,
      entry.actorUserId || null,
      entry.actorName || 'Guest',
      entry.actorRole || ROOM_ROLES.PARTICIPANT,
      entry.action,
      meta,
      createdAt
    );

  const logEntry = {
    id: Number(result.lastInsertRowid),
    actorUserId: entry.actorUserId || null,
    actorName: entry.actorName || 'Guest',
    actorRole: entry.actorRole || ROOM_ROLES.PARTICIPANT,
    action: entry.action,
    meta: entry.meta || null,
    createdAt
  };

  room.auditLog.push(logEntry);
  if (room.auditLog.length > MAX_AUDIT_LOG) {
    room.auditLog = room.auditLog.slice(-MAX_AUDIT_LOG);
  }

  return logEntry;
}

function createRoom(name = 'Room', userName, userId) {
  const id = ensureRoomId();
  const createdAt = nowIso();
  const roomName = name || 'Room';
  const directorName = userName || 'Director';
  const directorSecret = crypto.randomBytes(16).toString('hex');

  db.prepare(
    `INSERT INTO rooms (id, name, host_user_id, host_name, host_secret, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, roomName, userId || null, directorName, directorSecret, createdAt);

  db.prepare(
    `INSERT INTO room_state (room_id, action, time, video_id, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, 'paused', 0, defaultVideoId, createdAt);

  if (userId) {
    db.prepare(
      `INSERT OR IGNORE INTO room_users (room_id, user_id, joined_at)
       VALUES (?, ?, ?)`
    ).run(id, userId, createdAt);
  }

  const room = {
    id,
    name: roomName,
    directorName,
    directorUserId: userId || null,
    directorSecret,
    directorSocketId: null,
    moderators: new Set(),
    connectedUsers: new Map(),
    playlist: [defaultVideoId],
    auditLog: [],
    state: {
      roomId: id,
      currentVideoId: defaultVideoId,
      playbackStatus: 'paused',
      currentTime: 0,
      updatedAt: createdAt,
      controllerRole: ROOM_ROLES.DIRECTOR,
      directorUserId: userId || null,
      lastAction: 'room_created',
      lastActorName: directorName,
      startedAtMs: null
    }
  };

  rooms.set(id, room);
  recordVideo(id, defaultVideoId);
  appendAuditLog(room, {
    actorUserId: userId || null,
    actorName: directorName,
    actorRole: ROOM_ROLES.DIRECTOR,
    action: 'room_created',
    meta: { currentVideoId: defaultVideoId, playbackStatus: 'paused' },
    createdAt
  });

  return serializeRoomResponse(room, { includeControllerToken: true });
}

function joinRoom(roomId, userName, userId) {
  const room = getRoom(roomId);
  if (!room) throw new Error('Room not found');

  if (userId) {
    db.prepare(
      `INSERT OR IGNORE INTO room_users (room_id, user_id, joined_at)
       VALUES (?, ?, ?)`
    ).run(roomId, userId, nowIso());
  }

  return serializeRoomResponse(room);
}

function recordMessage(roomId, userId, userName, content) {
  if (!roomId || !content) return;
  db.prepare(
    `INSERT INTO messages (room_id, user_id, user_name, content, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(roomId, userId || null, userName || 'Guest', content, nowIso());
}

function getRecentMessages(roomId, limit = 30) {
  if (!roomId) return [];
  const rows = db
    .prepare(
      `SELECT user_name, content, created_at
       FROM messages
       WHERE room_id = ?
       ORDER BY id DESC
       LIMIT ?`
    )
    .all(roomId, limit);

  return rows
    .map((row) => ({
      roomId,
      user: row.user_name,
      text: row.content,
      timestamp: Date.parse(row.created_at)
    }))
    .reverse();
}

function recordVideo(roomId, videoId) {
  if (!roomId || !videoId) return;
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  db.prepare(
    `INSERT OR IGNORE INTO videos (room_id, video_id, url, added_at)
     VALUES (?, ?, ?, ?)`
  ).run(roomId, videoId, url, nowIso());
}

function getRoomSnapshot(roomId) {
  const room = typeof roomId === 'string' ? getRoom(roomId) : roomId;
  if (!room) return null;

  return {
    roomId: room.id,
    name: room.name,
    currentVideoId: room.state.currentVideoId,
    playbackStatus: room.state.playbackStatus,
    currentTime: roundTime(computeCurrentTime(room.state)),
    updatedAt: room.state.updatedAt,
    controllerRole: room.state.controllerRole,
    directorUserId: room.directorUserId,
    directorName: room.directorName,
    directorOnline: Boolean(room.directorSocketId),
    playlist: [...room.playlist],
    participants: Array.from(room.connectedUsers.values()).map((member) => ({
      socketId: member.socketId,
      userId: member.userId || null,
      userName: member.userName,
      role: member.role,
      joinedAt: member.joinedAt
    })),
    viewerCount: room.connectedUsers.size,
    lastAction: room.state.lastAction,
    lastActorName: room.state.lastActorName,
    log: room.auditLog.slice(-10)
  };
}

function addConnectedUser(roomId, member) {
  const room = getRoom(roomId);
  if (!room || !member?.socketId) return null;

  const connectedMember = {
    socketId: member.socketId,
    userId: member.userId || null,
    userName: member.userName || 'Guest',
    role: member.role || ROOM_ROLES.PARTICIPANT,
    joinedAt: member.joinedAt || nowIso()
  };

  room.connectedUsers.set(connectedMember.socketId, connectedMember);
  if (connectedMember.role === ROOM_ROLES.DIRECTOR) {
    room.directorSocketId = connectedMember.socketId;
  }

  return connectedMember;
}

function removeConnectedUser(roomId, socketId) {
  const room = getRoom(roomId);
  if (!room) return null;

  const member = room.connectedUsers.get(socketId) || null;
  room.connectedUsers.delete(socketId);

  if (room.directorSocketId === socketId) {
    room.directorSocketId = null;
  }

  return member;
}

function applyRoomCommand(roomId, action, payload = {}, actor = {}) {
  const room = getRoom(roomId);
  if (!room) {
    throw new Error('Room not found');
  }

  const nowMs = Date.now();
  const updatedAt = new Date(nowMs).toISOString();
  const fallbackCurrentTime = computeCurrentTime(room.state, nowMs);
  let nextCurrentTime = clampTime(
    Number.isFinite(payload.time) ? payload.time : fallbackCurrentTime
  );
  let nextVideoId = room.state.currentVideoId || defaultVideoId;

  switch (action) {
    case 'select_video': {
      const requestedVideoId = String(payload.videoId || '').trim();
      if (!requestedVideoId) {
        throw new Error('Video ID is required.');
      }
      nextVideoId = requestedVideoId;
      nextCurrentTime = 0;
      room.state.playbackStatus = 'paused';
      room.state.startedAtMs = null;
      if (!room.playlist.includes(requestedVideoId)) {
        room.playlist.push(requestedVideoId);
      }
      recordVideo(roomId, requestedVideoId);
      break;
    }

    case 'play_video':
      room.state.playbackStatus = 'playing';
      room.state.startedAtMs = nowMs - nextCurrentTime * 1000;
      break;

    case 'pause_video':
      room.state.playbackStatus = 'paused';
      room.state.startedAtMs = null;
      break;

    case 'seek_video':
      room.state.startedAtMs =
        room.state.playbackStatus === 'playing' ? nowMs - nextCurrentTime * 1000 : null;
      break;

    default:
      throw new Error(`Unsupported room action: ${action}`);
  }

  room.state.currentVideoId = nextVideoId;
  room.state.currentTime = nextCurrentTime;
  room.state.updatedAt = updatedAt;
  room.state.controllerRole = ROOM_ROLES.DIRECTOR;
  room.state.directorUserId = room.directorUserId;
  room.state.lastAction = action;
  room.state.lastActorName = actor.userName || room.directorName || 'Guest';

  persistRoomState(room);
  appendAuditLog(room, {
    actorUserId: actor.userId || null,
    actorName: actor.userName || 'Guest',
    actorRole: actor.role || ROOM_ROLES.PARTICIPANT,
    action,
    meta: {
      currentVideoId: room.state.currentVideoId,
      playbackStatus: room.state.playbackStatus,
      currentTime: room.state.currentTime
    },
    createdAt: updatedAt
  });

  return getRoomSnapshot(room);
}

module.exports = {
  rooms,
  defaultVideoId,
  createRoom,
  joinRoom,
  getRoom,
  getRoomSnapshot,
  addConnectedUser,
  removeConnectedUser,
  applyRoomCommand,
  recordMessage,
  getRecentMessages,
  recordVideo,
  appendAuditLog,
  computeCurrentTime
};
