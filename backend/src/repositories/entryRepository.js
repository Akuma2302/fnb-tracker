const { getDB } = require('../config/db');

function collection() {
  return getDB().collection('entries');
}

/**
 * Upserts one entry per (date, salesperson).
 */
async function saveEntry(data) {
  await collection().replaceOne(
    { date: data.date, salesperson: data.salesperson },
    data,
    { upsert: true }
  );
}

/**
 * Returns all entries sorted by date, ascending.
 */
async function getAllEntries() {
  return collection()
    .find({}, { projection: { _id: 0 } })
    .sort({ date: 1 })
    .toArray();
}

/**
 * Returns entries for a specific salesperson, most recent first.
 */
async function getEntriesBySalesperson(name, limit = 5) {
  return collection()
    .find({ salesperson: name }, { projection: { _id: 0 } })
    .sort({ date: -1 })
    .limit(limit)
    .toArray();
}

module.exports = { saveEntry, getAllEntries, getEntriesBySalesperson };
