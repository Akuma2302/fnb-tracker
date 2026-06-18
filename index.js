require('dotenv').config();
const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────
//  Config
// ─────────────────────────────────────────
const BOT_TOKEN = "8901982392:AAG0arsfB59Yzpf2x8T3LZW2Jgf76B6m7lA";
const PORT      = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// ─────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────
function getMalaysiaDate() {
  // Returns YYYY-MM-DD in Malaysia timezone
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ entries: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { entries: [] };
  }
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
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

// API: return all data as JSON
app.get('/api/data', (req, res) => {
  res.json(readData());
});

app.listen(PORT, () => {
  console.log(`✅  Dashboard running at http://localhost:${PORT}`);
});

// ─────────────────────────────────────────
//  Telegram Bot
// ─────────────────────────────────────────
const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// In-memory session store { chatId: { step, data } }
const sessions = {};

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
    `📅 *Step 1 of 6 — Date*\n\n` +
    `Enter the date _(YYYY-MM-DD)_\nor type *today* for ${today}:`,
    { parse_mode: 'Markdown' }
  );
});

// ── /view ───────────────────────────────
bot.onText(/\/view/, (msg) => {
  const data = readData();
  const recent = data.entries.slice(-7).reverse();

  if (recent.length === 0) {
    return bot.sendMessage(msg.chat.id,
      `📭 No entries yet.\nUse /log to add your first entry!`
    );
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
});

// ── /cancel ─────────────────────────────
bot.onText(/\/cancel/, (msg) => {
  delete sessions[msg.chat.id];
  bot.sendMessage(msg.chat.id, `❌ Entry cancelled.`);
});

// ── Multi-step input flow ────────────────
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();

  // Ignore commands or messages outside an active session
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
      bot.sendMessage(chatId,
        `🛒 *Step 3 of 6 — Transactions*\n\nHow many sales/orders today?`,
        { parse_mode: 'Markdown' }
      );
    },

    sales() {
      const val = parseInt(text);
      if (isNaN(val) || val < 0)
        return bot.sendMessage(chatId, `❌ Invalid. Enter a whole number, e.g. *45*`, { parse_mode: 'Markdown' });
      session.data.sales = val;
      session.step = 'losses';
      bot.sendMessage(chatId,
        `📉 *Step 4 of 6 — Losses*\n\nEnter total losses _(RM)_\n_e.g. refunds, voids, discounts_`,
        { parse_mode: 'Markdown' }
      );
    },

    losses() {
      const val = parseFloat(text);
      if (isNaN(val) || val < 0)
        return bot.sendMessage(chatId, `❌ Invalid amount. Try again:`);
      session.data.losses = val;
      session.step = 'wastage';
      bot.sendMessage(chatId,
        `🗑️ *Step 5 of 6 — Wastage*\n\nEnter wastage amount _(RM)_\n_e.g. spoiled/expired/discarded items_`,
        { parse_mode: 'Markdown' }
      );
    },

    wastage() {
      const val = parseFloat(text);
      if (isNaN(val) || val < 0)
        return bot.sendMessage(chatId, `❌ Invalid amount. Try again:`);
      session.data.wastage = val;
      session.step = 'notes';
      bot.sendMessage(chatId,
        `📝 *Step 6 of 6 — Notes*\n\nAny notes for today?\n_(type *skip* to leave empty)_`,
        { parse_mode: 'Markdown' }
      );
    },

    notes() {
      session.data.notes     = text.toLowerCase() === 'skip' ? '' : text;
      session.data.timestamp = new Date().toISOString();

      // Save (overwrite same date if exists)
      const data = readData();
      const idx  = data.entries.findIndex(e => e.date === session.data.date);
      if (idx >= 0) {
        data.entries[idx] = session.data;
      } else {
        data.entries.push(session.data);
      }
      data.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      saveData(data);

      const net = (session.data.revenue - session.data.losses - session.data.wastage).toFixed(2);
      bot.sendMessage(chatId,
        `✅ *Saved! Here's your summary:*\n\n` +
        `📅 Date:         ${session.data.date}\n` +
        `💰 Revenue:      ${formatRM(session.data.revenue)}\n` +
        `🛒 Transactions: ${session.data.sales}\n` +
        `📉 Losses:       ${formatRM(session.data.losses)}\n` +
        `🗑️ Wastage:      ${formatRM(session.data.wastage)}\n` +
        `📊 *Net:          ${formatRM(net)}*\n` +
        (session.data.notes ? `📝 Notes: ${session.data.notes}\n` : '') +
        `\n_Check your dashboard for full stats!_`,
        { parse_mode: 'Markdown' }
      );
      delete sessions[chatId];
    }
  };

  if (steps[session.step]) steps[session.step]();
});

bot.on('polling_error', (err) => console.error('Bot error:', err.message));
console.log(`🤖 Telegram bot is running...`);
