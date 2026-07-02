const { MongoClient } = require('mongodb');
const { env } = require('./env');
const logger = require('../utils/logger');

let client;
let db;

/**
 * Connects to MongoDB and ensures required indexes exist.
 * Safe to call once at server startup.
 */
async function connectDB() {
  client = new MongoClient(env.MONGO_URI);
  await client.connect();
  db = client.db('fnb_tracker');

  // Unique per salesperson per date — one entry per person per day
  await db.collection('entries').createIndex(
    { date: 1, salesperson: 1 },
    { unique: true }
  );

  logger.info('MongoDB connected');
  return db;
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialised. Call connectDB() before getDB().');
  }
  return db;
}

module.exports = { connectDB, getDB };
