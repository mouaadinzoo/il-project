// REST controllers for creating and joining rooms.
const store = require('../utils/roomsStore');

function createRoom(req, res) {
  try {
    const { name, user } = req.body;
    const authUser = req.user;
    const effectiveUser = authUser?.name || user;
    const room = store.createRoom(name, effectiveUser, authUser?.id || null);
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function joinRoom(req, res) {
  try {
    const { roomId, user } = req.body;
    const authUser = req.user;
    const effectiveUser = authUser?.name || user;
    const room = store.joinRoom(roomId, effectiveUser, authUser?.id || null);
    res.json(room);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

module.exports = { createRoom, joinRoom };
