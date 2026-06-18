require('dotenv').config();
const express    = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const path       = require('path');

// ─────────────────────────────────────────
//  Config
// ─────────────────────────────────────────
const BOT_TOKEN = "8901982392:AAG0arsfB59Yzpf2x8T3LZW2Jgf76B6m7lA";
const PORT      = 3000;
const MONGO_URI = "mongodb+srv://asyraaf2302_db_user:FJFJIu4hzUfpL2AU@cluster0.9jhroj0.mongodb.net/";

if (!BOT_TOKEN || !MONGO_URI) {
  console.error('❌ Missing BOT_TOKEN or MONGO_URI — check your .env file');
  process.exit(1);
}

// ─────────────────────────────────────────
//  MongoDB
// ─────────────────────────────────────────
let col; // entries collection

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  col = client.db('fnb_tracker').collection('entries');
  console.log('✅ Connected to MongoDB');
}

async function saveEntry(data) {
  await col.replaceOne({ date: data.date }, data, { upsert: true });
}

async function getEntries(limit = 0) {
  const cursor = col.find({}, { projection: { _id: 0 } }).sort({ date: 1 });
  return limit ? cursor.limit(limit).toArray() : cursor.toArray();
}

// ─────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────
function getMalaysiaDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function formatRM(val) {
  return `RM ${Number(val).toFixed(2)}`;
}

// ─────────────────────────────────────────
//  Express Server
// ─────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard data API
app.get('/api/data', async (req, res) => {
  try {
    const entries = await getEntries();
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check — used by UptimeRobot to keep server awake
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ─────────────────────────────────────────
//  Telegram Bot
// ─────────────────────────────────────────
const bot      = new TelegramBot(BOT_TOKEN, { polling: true });
const sessions = {}; // in-memory session store

// ── /start ──────────────────────────────
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `🍽️ *FnB Daily Tracker*\n\n` +
    `Hello! I help you track your daily FnB performance.\n\n` +
    `📋 *Commands:*\n` +
    `/log    — Log today's figures\n` +
    `/view   — View last 7 entries\n` +
    `/cancel — Cancel current entry\n` +
    `/help   — Show this menu`,
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `📋 *Available Commands:*\n\n` +
    `/log    — Log daily sales data\n` +
    `/view   — View last 7 entries\n` +
    `/cancel — Cancel current entry`,
    { parse_mode: 'Markdown' }
  );
});

// ── /log ────────────────────────────────
bot.onText(/\/log/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: 'date', data: {} };
  const today = getMalaysiaDate();
  bot.sendMessage(chatId,
    `📅 *Step 1 of 6 — Date*\n\nEnter the date _(YYYY-MM-DD)_\nor type *today* for ${today}:`,
    { parse_mode: 'Markdown' }
  );
});

// ── /view ───────────────────────────────
bot.onText(/\/view/, async (msg) => {
  try {
    const all    = await getEntries();
    const recent = all.slice(-7).reverse();

    if (recent.length === 0) {
      return bot.sendMessage(msg.chat.id, `📭 No entries yet.\nUse /log to add your first entry!`);
    }

    let text = `📊 *Last ${recent.length} Entries:*\n\n`;
    recent.forEach(e => {
      const net = (e.revenue - e.losses - e.wastage).toFixed(2);
      text += `📅 *${e.date}*\n`;
      text += `💰 Revenue: ${formatRM(e.revenue)}\n`;
      text += `🛒 Transactions: ${e.sales}\n`;
      text += `📉 Losses: ${formatRM(e.losses)}\n`;
      text += `🗑️ Wastage: ${formatRM(e.wastage)}\n`;
      text += `📊 Net: *${formatRM(net)}*\n`;
      if (e.notes) text += `📝 ${e.notes}\n`;
      text += `\n`;
    });

    bot.sendMessage(msg.chat.id, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(msg.chat.id, `❌ Error: ${err.message}`);
  }
});

// ── /cancel ─────────────────────────────
bot.onText(/\/cancel/, (msg) => {
  delete sessions[msg.chat.id];
  bot.sendMessage(msg.chat.id, `❌ Entry cancelled.`);
});

// ── Multi-step input flow ────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();

  if (!text || text.startsWith('/')) return;
  if (!sessions[chatId]) return;

  const session = sessions[chatId];

  const steps = {
    date() {
      session.data.date = text.toLowerCase() === 'today' ? getMalaysiaDate() : text;
      session.step = 'revenue';
      bot.sendMessage(chatId,
        `💰 *Step 2 of 6 — Revenue*\n\nEnter total revenue for the day _(in RM)_:`,
        { parse_mode: 'Markdown' }
      );
    },
    revenue() {
      const val = parseFloat(text);
      if (isNaN(val) || val < 0)
        return bot.sendMessage(chatId, `❌ Invalid. Enter a number, e.g. *1250.50*`, { parse_mode: 'Markdown' });
      session.data.revenue = val;
      session.step = 'sales';
      bot.sendMessage(chatId, `🛒 *Step 3 of 6 — Transactions*\n\nHow many sales/orders today?`, { parse_mode: 'Markdown' });
    },
    sales() {
      const val = parseInt(text);
      if (isNaN(val) || val < 0)
        return bot.sendMessage(chatId, `❌ Invalid. Enter a whole number, e.g. *45*`, { parse_mode: 'Markdown' });
      session.data.sales = val;
      session.step = 'losses';
      bot.sendMessage(chatId, `📉 *Step 4 of 6 — Losses*\n\nEnter total losses _(RM)_\n_e.g. refunds, voids, discounts_`, { parse_mode: 'Markdown' });
    },
    losses() {
      const val = parseFloat(text);
      if (isNaN(val) || val < 0) return bot.sendMessage(chatId, `❌ Invalid amount. Try again:`);
      session.data.losses = val;
      session.step = 'wastage';
      bot.sendMessage(chatId, `🗑️ *Step 5 of 6 — Wastage*\n\nEnter wastage amount _(RM)_\n_e.g. spoiled/expired/discarded items_`, { parse_mode: 'Markdown' });
    },
    wastage() {
      const val = parseFloat(text);
      if (isNaN(val) || val < 0) return bot.sendMessage(chatId, `❌ Invalid amount. Try again:`);
      session.data.wastage = val;
      session.step = 'notes';
      bot.sendMessage(chatId, `📝 *Step 6 of 6 — Notes*\n\nAny notes for today?\n_(type *skip* to leave empty)_`, { parse_mode: 'Markdown' });
    },
    async notes() {
      session.data.notes     = text.toLowerCase() === 'skip' ? '' : text;
      session.data.timestamp = new Date().toISOString();

      try {
        await saveEntry(session.data);
        const net = (session.data.revenue - session.data.losses - session.data.wastage).toFixed(2);
        bot.sendMessage(chatId,
          `✅ *Saved to database!*\n\n` +
          `📅 Date:         ${session.data.date}\n` +
          `💰 Revenue:      ${formatRM(session.data.revenue)}\n` +
          `🛒 Transactions: ${session.data.sales}\n` +
          `📉 Losses:       ${formatRM(session.data.losses)}\n` +
          `🗑️ Wastage:      ${formatRM(session.data.wastage)}\n` +
          `📊 *Net:          ${formatRM(net)}*\n` +
          (session.data.notes ? `📝 Notes: ${session.data.notes}\n` : '') +
          `\n_Dashboard updated! Check it now._`,
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to save: ${err.message}`);
      }
      delete sessions[chatId];
    }
  };

  if (steps[session.step]) await steps[session.step]();
});

bot.on('polling_error', (err) => console.error('Bot error:', err.message));

// ─────────────────────────────────────────
//  Start Everything
// ─────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`✅ Dashboard running at http://localhost:${PORT}`);
  });
  console.log(`🤖 Telegram bot is running...`);
}

start().catch(err => {
  console.error('❌ Startup failed:', err.message);
  process.exit(1);
});
