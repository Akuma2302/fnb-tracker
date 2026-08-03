const express = require('express');
const botController = require('../controllers/botController');

const router = express.Router();

// GET /api/bot-info — { username, link } used by the agent link page
router.get('/bot-info', botController.getBotInfo);

module.exports = router;
