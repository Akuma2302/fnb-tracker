const dashboardService = require('../services/dashboardService');

async function getData(req, res, next) {
  try {
    const payload = await dashboardService.getDashboardData();
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

module.exports = { getData };
