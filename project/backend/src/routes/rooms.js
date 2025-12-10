// Routes: POST /create and POST /join for room lifecycle.
const { Router } = require('express');
const { createRoom, joinRoom } = require('../controllers/roomsController');

const router = Router();

router.post('/create', createRoom);
router.post('/join', joinRoom);

module.exports = router;
