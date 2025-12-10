// REST controllers for creating and joining rooms.
const store = require('../utils/roomsStore');

function createRoom(req, res) {
  try {
    const { name, user } = req.body;
    const room = store.createRoom(name, user);
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function joinRoom(req, res) {
  try {
    const { roomId, user } = req.body;
    const room = store.joinRoom(roomId, user);
    res.json(room);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

module.exports = { createRoom, joinRoom };
