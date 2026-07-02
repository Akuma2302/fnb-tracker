require('dotenv').config();

// ─────────────────────────────────────────
//  Centralised environment configuration
// ─────────────────────────────────────────
const env = {
  BOT_TOKEN: '8901982392:AAGhg7FxW4-qvl6zNejebEzcMkVMveNEjf0',
  MONGO_URI: 'mongodb+srv://asyraaf2302_db_user:FJFJIu4hzUfpL2AU@cluster0.9jhroj0.mongodb.net/',
  PORT: 3000,
  TIMEZONE: 'Asia/Kuala_Lumpur',
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
