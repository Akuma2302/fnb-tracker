const { env } = require('../config/env');

function getBotInfo(req, res) {
  res.json({
    username: env.BOT_USERNAME || null,
    link: env.BOT_USERNAME ? `https://t.me/${env.BOT_USERNAME}` : null,
  });
}

module.exports = { getBotInfo };
