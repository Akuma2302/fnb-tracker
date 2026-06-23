require('dotenv').config();
const express     = require('express');
const TelegramBot = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const path        = require('path');

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
//  SKU DEFINITIONS
// ══════════════════════════════════════════
const SKUS = [
  { id: 1, name: 'Item A', salePrice: 10.00, costPrice: 7.00  },
  { id: 2, name: 'Item B', salePrice: 15.00, costPrice: 10.00 },
  { id: 3, name: 'Item C', salePrice: 8.00,  costPrice: 4.50  },
  { id: 4, name: 'Item D', salePrice: 12.00, costPrice: 9.00  },
  { id: 5, name: 'Item E', salePrice: 10.00, costPrice: 8.50  },
];

const DAILY_TARGET_REVENUE = 3200;
const DAILY_TARGET_UNITS   = 320;
const DAILY_WASTAGE_LIMIT  = 500;

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
let col;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  col = client.db('fnb_tracker').collection('entries');
  await col.createIndex({ date: 1, salesperson: 1 }, { unique: true });
  console.log('✅ Connected to MongoDB');
}

async function saveEntry(data) {
  await col.replaceOne(
    { date: data.date, salesperson: data.salesperson },
    data,
    { upsert: true }
  );
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
//  Express
// ─────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/data', async (req, res) => {
  try {
    const entries = await getEntries();
    res.json({ entries, skus: SKUS, targets: { revenue: DAILY_TARGET_REVENUE, units: DAILY_TARGET_UNITS, wastageLimit: DAILY_WASTAGE_LIMIT } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// ─────────────────────────────────────────
//  Telegram Bot
// ─────────────────────────────────────────
const bot      = new TelegramBot(BOT_TOKEN, { polling: true });

// sessions[chatId] = { step, data }
// steps: 'setname' | 'date' | 'date_custom' | 'sku' | 'notes'
const sessions = {};

// spNames[chatId] = 'Akmal'  (survives across sessions in-memory)
const spNames  = {};

// ── UI helpers ────────────────────────────
function sendDatePicker(chatId) {
  const today = getMalaysiaDate(0);
  const yest  = getMalaysiaDate(1);
  bot.sendMessage(chatId,
    `📅 Step 1 — Choose Date\n\nTap a quick option or type your own:`,
    {
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
    }
  );
}

async function promptSKU(chatId, idx) {
  const sku  = SKUS[idx];
  const step = idx + 2;
  return bot.sendMessage(chatId,
    `🛒 Step ${step} of ${SKUS.length + 2} — ${sku.name}\n\n` +
    `Sale: RM${sku.salePrice} | Cost: RM${sku.costPrice}\n\n` +
    `Enter sold,wasted — e.g. 25,3\n(type 0,0 if not sold today)`
  );
}

function startLogFlow(chatId, name) {
  sessions[chatId] = {
    step: 'sku',          // ← skip 'date' step, jump straight after date picker
    data: { salesperson: name, date: null, skuData: [], skuIndex: 0 },
  };
  sendDatePicker(chatId);
  // session stays at step 'sku' — date is set by callback_query, then promptSKU fires
  // We use a special intermediate step called 'awaiting_date' to avoid confusion:
  sessions[chatId].step = 'awaiting_date';
}

// ── /start ───────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const tgName = msg.from?.first_name || 'there';
  bot.sendMessage(chatId,
    `🍽️ *FnB Daily Tracker*\n\nHi ${tgName}!\n\n` +
    `📋 *Commands:*\n` +
    `/log      — Log today's sales\n` +
    `/view     — View your last 5 entries\n` +
    `/setname  — Change your name\n` +
    `/cancel   — Cancel current entry\n` +
    `/help     — Show this menu`,
    { parse_mode: 'Markdown' }
  );
});

// ── /help ─────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `📋 *Commands:*\n\n` +
    `/log      — Log daily sales by SKU\n` +
    `/view     — View last 5 entries\n` +
    `/setname  — Update your name\n` +
    `/cancel   — Cancel current entry`,
    { parse_mode: 'Markdown' }
  );
});

// ── /setname ─────────────────────────────
bot.onText(/\/setname/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: 'setname', data: {} };
  bot.sendMessage(chatId, `👤 What's your name?`, { parse_mode: 'Markdown' });
});

// ── /log ─────────────────────────────────
bot.onText(/\/log/, (msg) => {
  const chatId = msg.chat.id;
  if (!spNames[chatId]) {
    // Need name first — store intent so after name we auto-start log
    sessions[chatId] = { step: 'setname', data: { afterName: 'log' } };
    bot.sendMessage(chatId, `👤 First, what's your *name*?`, { parse_mode: 'Markdown' });
    return;
  }
  startLogFlow(chatId, spNames[chatId]);
});

// ── /view ─────────────────────────────────
bot.onText(/\/view/, async (msg) => {
  const chatId = msg.chat.id;
  const name   = spNames[chatId];
  try {
    const all    = await getEntries();
    const mine   = name ? all.filter(e => e.salesperson === name) : all;
    const recent = mine.slice(-5).reverse();
    if (!recent.length) {
      return bot.sendMessage(chatId, `📭 No entries yet. Use /log to add data!`);
    }
    let text = `📊 *Last ${recent.length} Entries${name ? ` — ${name}` : ''}:*\n\n`;
    recent.forEach(e => {
      const t = e.totals;
      text += `📅 *${e.date}*\n`;
      (e.skuData || []).forEach(s => {
        text += `  • ${s.name}: ${s.sold} sold, ${s.wasted} wasted → ${formatRM(s.revenue)}\n`;
      });
      text += `💰 ${formatRM(t.revenue)} | GP: ${formatRM(t.grossProfit)} | Waste: ${formatRM(t.wastageCost)} | ${t.grossMarginPct}%\n\n`;
    });
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    bot.sendMessage(chatId, `❌ Error: ${err.message}`);
  }
});

// ── /cancel ───────────────────────────────
bot.onText(/\/cancel/, (msg) => {
  delete sessions[msg.chat.id];
  bot.sendMessage(msg.chat.id, `❌ Entry cancelled.`);
});

// ════════════════════════════════════════════
//  CALLBACK QUERY — handles inline button taps
//  THIS IS THE FIX: robust chatId + session lookup
// ════════════════════════════════════════════
bot.on('callback_query', async (query) => {
  // Always answer immediately — stops the Telegram "loading" spinner
  await bot.answerCallbackQuery(query.id);

  // chatId can come from query.message.chat.id OR query.from.id (private chats same, groups differ)
  const chatId  = query.message.chat.id;
  const session = sessions[chatId];

  if (!session) {
    // Session expired — tell user to restart
    bot.sendMessage(chatId, `⏰ Session expired. Use /log to start again.`);
    return;
  }

  if (query.data.startsWith('date:')) {
    if (query.data === 'date:custom') {
      session.step = 'date_custom';
      bot.sendMessage(chatId,
        `✏️ Type the date in YYYY-MM-DD format:\ne.g. 2025-06-18`
      );
      return;
    }

    // A real date was picked
    const chosenDate        = query.data.replace('date:', '');
    session.data.date       = chosenDate;
    session.data.skuIndex   = 0;
    session.step            = 'sku';

    await bot.sendMessage(chatId, `✅ Date set: ${chosenDate}\n\nNow enter each SKU's numbers:`);
    await promptSKU(chatId, 0);
  }
});

// ════════════════════════════════════════════
//  MESSAGE HANDLER — text input steps
// ════════════════════════════════════════════
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();

  // Ignore empty messages and /commands (handled by onText above)
  if (!text || text.startsWith('/')) return;

  const session = sessions[chatId];

  // ── Structured session steps ──────────────
  if (session) {
    const { step, data } = session;

    // ── Step: collect name ──
    if (step === 'setname') {
      const name = text;
      spNames[chatId] = name;
      delete sessions[chatId];
      await bot.sendMessage(chatId, `✅ Name saved as ${name}!`);
      // If they came via /log, auto-start the log flow
      if (data.afterName === 'log') {
        startLogFlow(chatId, name);
      }
      return;
    }

    // ── Step: awaiting_date (date picker shown, waiting for button tap OR ignore text) ──
    if (step === 'awaiting_date') {
      // User typed instead of tapping — remind them to tap a button
      bot.sendMessage(chatId,
        `☝️ Please tap one of the date buttons above, or tap "Type a different date".`
      );
      return;
    }

    // ── Step: custom date typed ──
    if (step === 'date_custom') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        bot.sendMessage(chatId,
          `❌ Wrong format. Enter as YYYY-MM-DD\ne.g. 2025-06-18`
        );
        return;
      }
      data.date       = text;
      data.skuIndex   = 0;
      session.step    = 'sku';
      await bot.sendMessage(chatId, `✅ Date set: ${text}`);
      await promptSKU(chatId, 0);
      return;
    }

    // ── Step: entering SKU quantities ──
    if (step === 'sku') {
      const parts = text.split(',').map(s => parseInt(s.trim(), 10));
      if (parts.length !== 2 || parts.some(isNaN) || parts.some(v => v < 0)) {
        bot.sendMessage(chatId,
          `❌ Enter two numbers: sold,wasted\ne.g. 25,3 or 0,0`
        );
        return;
      }
      const [sold, wasted] = parts;
      const sku = SKUS[data.skuIndex];
      data.skuData.push(calcSKUData(sku, sold, wasted));
      data.skuIndex++;

      if (data.skuIndex < SKUS.length) {
        await promptSKU(chatId, data.skuIndex);
      } else {
        session.step = 'notes';
        bot.sendMessage(chatId,
          `📝 Last step — Notes\n\nAny notes? (type skip to leave empty)`
        );
      }
      return;
    }

    // ── Step: notes + save ──
    if (step === 'notes') {
      data.notes     = text.toLowerCase() === 'skip' ? '' : text;
      data.timestamp = new Date().toISOString();
      data.totals    = calcTotals(data.skuData);

      try {
        await saveEntry(data);
        const t = data.totals;
        let reply  = `✅ Saved!\n\n📅 ${data.date} · 👤 ${data.salesperson}\n\n`;
        reply += `SKU Breakdown:\n`;
        data.skuData.forEach(s => {
          reply += `• ${s.name}: ${s.sold} sold, ${s.wasted} wasted\n`;
          reply += `  Rev: ${formatRM(s.revenue)} | Waste: ${formatRM(s.wastageCost)}\n`;
        });
        reply += `\n📊 Summary:\n`;
        reply += `💰 Revenue: ${formatRM(t.revenue)}\n`;
        reply += `📈 Gross Profit: ${formatRM(t.grossProfit)}\n`;
        reply += `🗑️ Wastage: ${formatRM(t.wastageCost)}\n`;
        reply += `📉 Margin: ${t.grossMarginPct}%\n`;
        if (data.notes) reply += `📝 ${data.notes}\n`;
        reply += `\nDashboard updated!`;
        bot.sendMessage(chatId, reply);
      } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to save: ${err.message}`);
      }
      delete sessions[chatId];
      return;
    }
  }

  // ── No active session — keyword matching ──
  const lower = text.toLowerCase();
  const resolvedIntent =
      lower.includes('log') || lower.includes('record') || lower.includes('jualan') || lower.includes('sales') ? 'LOG'
    : lower.includes('view') || lower.includes('tunjuk') || lower.includes('check') ? 'VIEW'
    : lower.includes('help') || lower.includes('tolong') ? 'HELP'
    : lower.includes('cancel') || lower.includes('batal') ? 'CANCEL'
    : 'UNKNOWN';

  if (resolvedIntent === 'LOG') {
    if (!spNames[chatId]) {
      sessions[chatId] = { step: 'setname', data: { afterName: 'log' } };
      bot.sendMessage(chatId, `👤 First, what's your name? Type it below:`);
    } else {
      startLogFlow(chatId, spNames[chatId]);
    }
  } else if (resolvedIntent === 'VIEW') {
    bot.sendMessage(chatId, `Use /view to see your recent entries.`);
  } else if (resolvedIntent === 'HELP') {
    bot.sendMessage(chatId, `Use /help to see available commands.`);
  } else if (resolvedIntent === 'CANCEL') {
    delete sessions[chatId];
    bot.sendMessage(chatId, `❌ Cancelled.`);
  } else {
    bot.sendMessage(chatId,
      `🤔 Not sure what you mean.\n\nTry:\n/log — record sales\n/view — see entries\n/help — all commands`
    );
  }
});

bot.on('polling_error', (err) => console.error('Bot polling error:', err.message));

// ─────────────────────────────────────────
//  Start
// ─────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`✅ Dashboard → http://localhost:${PORT}`));
  console.log(`🤖 Bot running (keyword matching mode)...`);
}

start().catch(err => { console.error('❌ Startup failed:', err.message); process.exit(1); });