// SQLite-backed room store with in-memory runtime state for sockets.
const crypto = require('crypto');
const { db } = require('../db');

const rooms = new Map();
const defaultVideoId = 'dQw4w9WgXcQ'; // starter video

const nowIso = () => new Date().toISOString();

function serialize(room, { includeSecret = false } = {}) {
  const serialized = {
    id: room.id,
    name: room.name,
    host: room.host,
    users: Array.from(room.users),
    playlist: [...room.playlist],
    videoState: { ...room.videoState }
  };

  if (includeSecret) {
    serialized.hostSecret = room.hostSecret;
  }

  return serialized;
}

function buildRoom(roomRow, stateRow) {
  return {
    id: roomRow.id,
    name: roomRow.name,
    host: roomRow.host_name,
    hostSecret: roomRow.host_secret,
    hostSocketId: null,
    users: new Set(),
    playlist: [],
    videoState: {
      action: stateRow?.action || 'pause',
      time: stateRow?.time ?? 0,
      videoId: stateRow?.video_id || defaultVideoId
    }
  };
}

function loadRoom(roomId) {
  const roomRow = db
    .prepare(
      `SELECT id, name, host_name, host_secret
       FROM rooms
       WHERE id = ?`
    )
    .get(roomId);
  if (!roomRow) return null;
  const stateRow = db
    .prepare(
      `SELECT action, time, video_id
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

function createRoom(name = 'Room', userName, userId) {
  const id = ensureRoomId();
  const hostSecret = crypto.randomBytes(16).toString('hex');
  const createdAt = nowIso();
  const roomName = name || 'Room';
  const hostName = userName || 'Host';

  db.prepare(
    `INSERT INTO rooms (id, name, host_user_id, host_name, host_secret, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, roomName, userId || null, hostName, hostSecret, createdAt);

  db.prepare(
    `INSERT INTO room_state (room_id, action, time, video_id, updated_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, 'pause', 0, defaultVideoId, createdAt);

  if (userId) {
    db.prepare(
      `INSERT OR IGNORE INTO room_users (room_id, user_id, joined_at)
       VALUES (?, ?, ?)`
    ).run(id, userId, createdAt);
  }

  const room = {
    id,
    name: roomName,
    host: hostName,
    hostSecret,
    hostSocketId: null,
    users: new Set(),
    playlist: [],
    videoState: { action: 'pause', time: 0, videoId: defaultVideoId }
  };

  if (userName) room.users.add(userName);
  rooms.set(id, room);
  return serialize(room, { includeSecret: true });
}

function joinRoom(roomId, userName, userId) {
  const room = getRoom(roomId);
  if (!room) throw new Error('Room not found');
  if (userName) room.users.add(userName);
  if (userId) {
    db.prepare(
      `INSERT OR IGNORE INTO room_users (room_id, user_id, joined_at)
       VALUES (?, ?, ?)`
    ).run(roomId, userId, nowIso());
  }
  return serialize(room, { includeSecret: false });
}

function updateRoomState(roomId, action, time, videoId) {
  if (!roomId) return;
  db.prepare(
    `INSERT INTO room_state (room_id, action, time, video_id, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(room_id)
     DO UPDATE SET action = excluded.action,
                   time = excluded.time,
                   video_id = excluded.video_id,
                   updated_at = excluded.updated_at`
  ).run(roomId, action, time, videoId, nowIso());
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
  const rows = db.prepare(
    `SELECT user_name, content, created_at
     FROM messages
     WHERE room_id = ?
     ORDER BY id DESC
     LIMIT ?`
  ).all(roomId, limit);
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

module.exports = {
  createRoom,
  joinRoom,
  getRoom,
  updateRoomState,
  recordMessage,
  getRecentMessages,
  recordVideo,
  rooms
};
