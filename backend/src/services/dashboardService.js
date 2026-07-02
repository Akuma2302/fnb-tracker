const entryRepository = require('../repositories/entryRepository');
const SKUS = require('../models/skuModel');
const TARGETS = require('../models/targetModel');

/**
 * Assembles the full payload the frontend dashboard needs in one call.
 */
async function getDashboardData() {
  const entries = await entryRepository.getAllEntries();
  return { entries, skus: SKUS, targets: TARGETS };
}

module.exports = { getDashboardData };
