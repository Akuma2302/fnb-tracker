const { env, assertRequiredEnv } = require('./src/config/env');
const { connectDB } = require('./src/config/db');
const createApp = require('./src/app');
const { startBot } = require('./src/services/telegramBotService');
const logger = require('./src/utils/logger');

async function start() {
  assertRequiredEnv();
  await connectDB();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`Dashboard running at http://localhost:${env.PORT}`);
  });

  startBot();
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
