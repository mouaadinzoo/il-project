// Simple in-memory room store. Replace with DB in production.
const crypto = require('crypto');

const rooms = new Map();

const defaultVideoId = 'dQw4w9WgXcQ'; // starter video

function serialize(room) {
  return { ...room, users: Array.from(room.users) };
}

function createRoom(name = 'Room', user) {
  const id = crypto.randomBytes(3).toString('hex');
  const room = {
    id,
    name,
    users: new Set(),
    playlist: [],
    videoState: { action: 'pause', time: 0, videoId: defaultVideoId }
  };
  if (user) room.users.add(user);
  rooms.set(id, room);
  return serialize(room);
}

function joinRoom(roomId, user) {
  const room = rooms.get(roomId);
  if (!room) throw new Error('Room not found');
  if (user) room.users.add(user);
  return serialize(room);
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

module.exports = { createRoom, joinRoom, getRoom, rooms };
