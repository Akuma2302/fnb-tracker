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

// ══════════════════════════════════════════
//  ✏️  SKU DEFINITIONS — EDIT HERE
//  Change name, salePrice, costPrice to match your menu
// ══════════════════════════════════════════
const SKUS = [
  { id: 1, name: 'Item A', salePrice: 10.00, costPrice: 7.00  },
  { id: 2, name: 'Item B', salePrice: 15.00, costPrice: 10.00 },
  { id: 3, name: 'Item C', salePrice: 8.00,  costPrice: 4.50  },
  { id: 4, name: 'Item D', salePrice: 12.00, costPrice: 9.00  },
  { id: 5, name: 'Item E', salePrice: 10.00, costPrice: 8.50  },
];

// ─────────────────────────────────────────
//  Calculation Helpers
// ─────────────────────────────────────────
function calcSKUData(sku, sold, wasted) {
  return {
    id:          sku.id,
    name:        sku.name,
    salePrice:   sku.salePrice,
    costPrice:   sku.costPrice,
    sold,
    wasted,
    revenue:     +(sold  * sku.salePrice).toFixed(2),
    grossProfit: +(sold  * (sku.salePrice - sku.costPrice)).toFixed(2),
    wastageCost: +(wasted * sku.costPrice).toFixed(2),
  };
}


function calcTotals(skuData) {
  const revenue     = skuData.reduce((a, s) => a + s.revenue,     0);
  const grossProfit = skuData.reduce((a, s) => a + s.grossProfit, 0);
  const wastageCost = skuData.reduce((a, s) => a + s.wastageCost, 0);
  return {
    revenue:        +revenue.toFixed(2),
    grossProfit:    +grossProfit.toFixed(2),
    wastageCost:    +wastageCost.toFixed(2),
    netProfit:      +(grossProfit - wastageCost).toFixed(2),
    grossMarginPct: revenue > 0 ? +((grossProfit / revenue) * 100).toFixed(1) : 0,
    totalSold:      skuData.reduce((a, s) => a + s.sold,   0),
    totalWasted:    skuData.reduce((a, s) => a + s.wasted, 0),
  };
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

async function getEntries() {
  return col.find({}, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();
}

// ─────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────
function getMalaysiaDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}
 
function formatRM(val) { return `RM ${Number(val).toFixed(2)}`; }

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
    res.json({ entries, skus: SKUS });
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


// ── Helper: send the date picker keyboard ─
function sendDatePicker(chatId) {
  const today = getMalaysiaDate(0);
  const yest  = getMalaysiaDate(1);
 
  bot.sendMessage(chatId, `📅 *Step 1 — Choose Date*\n\nTap a quick option or type your own:`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: `📅 Today (${today})`,     callback_data: `date:${today}` },
          { text: `⬅️ Yesterday (${yest})`,  callback_data: `date:${yest}`  },
        ],
        [
          { text: '✏️ Type a different date', callback_data: 'date:custom'  },
        ],
      ],
    },
  });
}

// ── Helper: prompt for a SKU ──────────────
function promptSKU(chatId, idx) {
  const sku  = SKUS[idx];
  const step = idx + 2; // step 2 through 6
  bot.sendMessage(chatId,
    `🛒 *Step ${step} of ${SKUS.length + 2} — ${sku.name}*\n\n` +
    `💰 Sale: RM${sku.salePrice} | Cost: RM${sku.costPrice}\n\n` +
    `Enter *sold,wasted* pcs separated by comma:\n` +
    `_e.g. 25,3 = 25 sold, 3 wasted_\n` +
    `_Type 0,0 if not sold today_`,
    { parse_mode: 'Markdown' }
  );
}

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

// ── /log — show date picker ──────────────
bot.onText(/\/log/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: 'date', data: { skuData: [], skuIndex: 0 } };
  sendDatePicker(chatId);
});

// ── /view ───────────────────────────────
bot.onText(/\/view/, async (msg) => {
  try {
    const all    = await getEntries();
    const recent = all.slice(-5).reverse();
 
    if (recent.length === 0) {
      return bot.sendMessage(msg.chat.id, `📭 No entries yet. Use /log to add data!`);
    }
 
    let text = `📊 *Last ${recent.length} Entries:*\n\n`;
    recent.forEach(e => {
      const t = e.totals;
      text += `📅 *${e.date}*\n`;
      e.skuData.forEach(s => {
        text += `  • ${s.name}: ${s.sold} sold, ${s.wasted} wasted → ${formatRM(s.revenue)}\n`;
      });
      text += `💰 Revenue:    ${formatRM(t.revenue)}\n`;
      text += `📈 Gross Profit: ${formatRM(t.grossProfit)}\n`;
      text += `🗑️ Wastage:    ${formatRM(t.wastageCost)}\n`;
      text += `📊 Margin:     ${t.grossMarginPct}%\n`;
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

// ── Inline keyboard handler (date buttons) ─
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  bot.answerCallbackQuery(query.id);
 
  if (!sessions[chatId]) return;
  const session = sessions[chatId];
 
  if (query.data.startsWith('date:')) {
    if (query.data === 'date:custom') {
      session.step = 'date_custom';
      bot.sendMessage(chatId, `✏️ Type the date _(YYYY-MM-DD)_:\n_e.g. 2025-06-18_`, { parse_mode: 'Markdown' });
      return;
    }
 
    // A quick date was selected
    session.data.date     = query.data.replace('date:', '');
    session.step          = 'sku';
    session.data.skuIndex = 0;
    bot.sendMessage(chatId, `✅ Date set: *${session.data.date}*`, { parse_mode: 'Markdown' });
    promptSKU(chatId, 0);
  }
});

// ── Multi-step text input ────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();
 
  if (!text || text.startsWith('/')) return;
  if (!sessions[chatId]) return;
 
  const session = sessions[chatId];
 
  const steps = {
 
    // Waiting for typed custom date
    date_custom() {
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(text);
      if (!valid)
        return bot.sendMessage(chatId, `❌ Wrong format. Enter as YYYY-MM-DD\n_e.g. 2025-06-18_`, { parse_mode: 'Markdown' });
      session.data.date     = text;
      session.step          = 'sku';
      session.data.skuIndex = 0;
      bot.sendMessage(chatId, `✅ Date set: *${text}*`, { parse_mode: 'Markdown' });
      promptSKU(chatId, 0);
    },
 
    // Entering pcs per SKU (sold,wasted)
    sku() {
      const parts = text.split(',').map(s => parseInt(s.trim()));
      if (parts.length !== 2 || parts.some(isNaN) || parts.some(v => v < 0))
        return bot.sendMessage(chatId,
          `❌ Enter two numbers: *sold,wasted*\n_e.g. 25,3_\n_Type 0,0 if none_`,
          { parse_mode: 'Markdown' }
        );
 
      const [sold, wasted] = parts;
      const sku = SKUS[session.data.skuIndex];
      session.data.skuData.push(calcSKUData(sku, sold, wasted));
      session.data.skuIndex++;
 
      if (session.data.skuIndex < SKUS.length) {
        promptSKU(chatId, session.data.skuIndex);
      } else {
        session.step = 'notes';
        bot.sendMessage(chatId,
          `📝 *Last step — Notes*\n\nAny notes for today?\n_(type *skip* to leave empty)_`,
          { parse_mode: 'Markdown' }
        );
      }
    },
 
    // Final step: save everything
    async notes() {
      session.data.notes     = text.toLowerCase() === 'skip' ? '' : text;
      session.data.timestamp = new Date().toISOString();
      session.data.totals    = calcTotals(session.data.skuData);
 
      try {
        await saveEntry(session.data);
        const t = session.data.totals;
 
        let msg  = `✅ *Saved to database!*\n\n`;
        msg += `📅 Date: *${session.data.date}*\n\n`;
        msg += `*SKU Breakdown:*\n`;
        session.data.skuData.forEach(s => {
          msg += `• ${s.name}: ${s.sold} sold, ${s.wasted} wasted\n`;
          msg += `  Revenue: ${formatRM(s.revenue)} | GP: ${formatRM(s.grossProfit)} | Wastage: ${formatRM(s.wastageCost)}\n`;
        });
        msg += `\n📊 *Summary:*\n`;
        msg += `💰 Revenue:        ${formatRM(t.revenue)}\n`;
        msg += `📈 Gross Profit:   ${formatRM(t.grossProfit)}\n`;
        msg += `🗑️ Wastage Cost:   ${formatRM(t.wastageCost)}\n`;
        msg += `📊 Net:            ${formatRM(t.netProfit)}\n`;
        msg += `📉 Gross Margin:   ${t.grossMarginPct}%\n`;
        if (session.data.notes) msg += `📝 Notes: ${session.data.notes}\n`;
        msg += `\n_Dashboard updated!_`;
 
        bot.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
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
