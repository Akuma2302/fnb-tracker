require('dotenv').config();

// ─────────────────────────────────────────
//  Centralised environment configuration
// ─────────────────────────────────────────
const env = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  MONGO_URI: process.env.MONGO_URI || '',
  PORT: Number(process.env.PORT) || 3000,
  TIMEZONE: process.env.TIMEZONE || 'Asia/Kuala_Lumpur',
};

function assertRequiredEnv() {
  const missing = [];
  if (!env.BOT_TOKEN) missing.push('BOT_TOKEN');
  if (!env.MONGO_URI) missing.push('MONGO_URI');

  if (missing.length) {
    console.error(`❌ Missing required environment variable(s): ${missing.join(', ')}`);
    console.error('   Copy backend/.env.example to backend/.env and fill in the values.');
    process.exit(1);
  }
}

module.exports = { env, assertRequiredEnv };
