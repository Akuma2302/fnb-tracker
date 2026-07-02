const express = require('express');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

// GET /api/data — full dashboard payload (entries, skus, targets)
router.get('/data', dashboardController.getData);

module.exports = router;
