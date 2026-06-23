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

// ─────────────────────────────────────────
//  Hermes Agent Config
//  Replaces direct keyword matching with
//  NousResearch Hermes for natural language
// ─────────────────────────────────────────
const HERMES_API_URL = 'https://hermes-agent.nousresearch.com/v1/chat/completions';
const HERMES_MODEL   = 'hermes-agent'; // adjust to current Hermes model name if different
const HERMES_API_KEY = 'Asyraaf1234!';


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

// ══════════════════════════════════════════
//  Daily Revenue Target
// ══════════════════════════════════════════
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
//  NEW: entries now keyed by date + salesperson
//  Collection: entries (one doc per salesperson per date)
// ─────────────────────────────────────────
let col;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  col = client.db('fnb_tracker').collection('entries');
  // compound unique index: one entry per salesperson per date
  await col.createIndex({ date: 1, salesperson: 1 }, { unique: true });
  console.log('✅ Connected to MongoDB');
}

// Save or update ONE salesperson's entry for the day
async function saveEntry(data) {
  await col.replaceOne(
    { date: data.date, salesperson: data.salesperson },
    data,
    { upsert: true }
  );
}

// Return all entries (sorted by date asc)
async function getEntries() {
  return col.find({}, { projection: { _id: 0 } }).sort({ date: 1 }).toArray();
}

// ─────────────────────────────────────────
//  Date / Format Helpers
// ─────────────────────────────────────────
function getMalaysiaDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function formatRM(val) { return `RM ${Number(val).toFixed(2)}`; }

// ─────────────────────────────────────────
//  Hermes Agent — natural language intent
// ─────────────────────────────────────────
//
//  HOW IT WORKS:
//  When a user sends a free-text message that doesn't match a
//  structured /command, we send it to Hermes and ask it to classify
//  the intent as one of: LOG, VIEW, HELP, CANCEL, UNKNOWN.
//  For LOG/VIEW it also extracts any date or name mentioned.
//
//  This means salespersons can say things like:
//    "nak log jualan hari ni"
//    "tunjuk sales minggu lepas"
//    "I want to record today's numbers"
//  ...and the bot will understand.
//
async function classifyIntent(text, salesperson) {
  const systemPrompt = `You are an intent classifier for a food & beverage sales tracking Telegram bot.
Classify the user's message into exactly one of these intents:
- LOG: user wants to log/record/submit/update their sales for a day
- VIEW: user wants to see/check/view past sales data or reports
- HELP: user needs help or doesn't know what to do
- CANCEL: user wants to cancel/stop the current operation
- UNKNOWN: none of the above

Also extract:
- date_hint: any date mentioned (ISO format YYYY-MM-DD) or null
- name_hint: any salesperson name mentioned or null

Respond ONLY with valid JSON in this exact format:
{"intent":"LOG","date_hint":null,"name_hint":null}

The salesperson's name is: ${salesperson}`;

  try {
    const response = await fetch(HERMES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HERMES_API_KEY}`,
      },
      body: JSON.stringify({
        model: HERMES_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        temperature: 0,
        max_tokens: 100,
      }),
    });

    const data = await response.json();
    const raw  = data.choices?.[0]?.message?.content?.trim() || '{}';
    return JSON.parse(raw);
  } catch (err) {
    console.error('Hermes API error:', err.message);
    return { intent: 'UNKNOWN', date_hint: null, name_hint: null };
  }
}

// ─────────────────────────────────────────
//  Express — API + static dashboard
// ─────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// All entries + SKU definitions
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
const sessions = {};   // keyed by chatId

// ── Helper: persist salesperson name ──────
// Stored per chatId in MongoDB (optional but
// nice UX so they don't retype their name)
const spNames = {}; // in-memory cache: chatId → name

async function getOrAskName(chatId) {
  if (spNames[chatId]) return spNames[chatId];
  // Ask
  bot.sendMessage(chatId,
    `👤 *Who are you?*\n\nType your *name* so I can track your sales separately.\n_e.g. Azri_`,
    { parse_mode: 'Markdown' }
  );
  return null;
}

// ── Date picker keyboard ──────────────────
function sendDatePicker(chatId) {
  const today = getMalaysiaDate(0);
  const yest  = getMalaysiaDate(1);
  bot.sendMessage(chatId, `📅 *Step 1 — Choose Date*\n\nTap a quick option or type your own:`, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: `📅 Today (${today})`,    callback_data: `date:${today}` },
          { text: `⬅️ Yesterday (${yest})`, callback_data: `date:${yest}`  },
        ],
        [
          { text: '✏️ Type a different date', callback_data: 'date:custom' },
        ],
      ],
    },
  });
}

// ── SKU prompt ────────────────────────────
function promptSKU(chatId, idx) {
  const sku  = SKUS[idx];
  const step = idx + 2;
  bot.sendMessage(chatId,
    `🛒 *Step ${step} of ${SKUS.length + 2} — ${sku.name}*\n\n` +
    `💰 Sale: RM${sku.salePrice} | Cost: RM${sku.costPrice}\n\n` +
    `Enter *sold,wasted* pcs separated by comma:\n` +
    `_e.g. 25,3 = 25 sold, 3 wasted_\n` +
    `_Type 0,0 if not sold today_`,
    { parse_mode: 'Markdown' }
  );
}

// ── /start ───────────────────────────────
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const tgName = msg.from?.first_name || msg.from?.username || 'there';

  bot.sendMessage(chatId,
    `🍽️ *FnB Daily Tracker*\n\n` +
    `Hi ${tgName}! Track your daily sales by SKU.\n\n` +
    `📋 *Commands:*\n` +
    `/log    — Log your sales for a day\n` +
    `/view   — View your last 5 entries\n` +
    `/setname — Set or change your name\n` +
    `/cancel — Cancel current entry\n` +
    `/help   — Show this menu\n\n` +
    `💡 You can also just *type naturally* — I'll understand you!`,
    { parse_mode: 'Markdown' }
  );
});

// ── /setname ─────────────────────────────
bot.onText(/\/setname/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: 'setname' };
  bot.sendMessage(chatId, `👤 Type your *name*:`, { parse_mode: 'Markdown' });
});

// ── /help ─────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id,
    `📋 *Commands:*\n\n` +
    `/log      — Log daily sales by SKU\n` +
    `/view     — View your last 5 entries\n` +
    `/setname  — Set or change your display name\n` +
    `/cancel   — Cancel current entry\n\n` +
    `💡 Or just type naturally — I understand Bahasa & English!`,
    { parse_mode: 'Markdown' }
  );
});

// ── /log ─────────────────────────────────
bot.onText(/\/log/, async (msg) => {
  const chatId = msg.chat.id;
  const name   = spNames[chatId];
  if (!name) {
    sessions[chatId] = { step: 'setname', afterName: 'log' };
    bot.sendMessage(chatId, `👤 First, what's your *name*? Type it below:`, { parse_mode: 'Markdown' });
    return;
  }
  sessions[chatId] = { step: 'date', data: { salesperson: name, skuData: [], skuIndex: 0 } };
  sendDatePicker(chatId);
});

// ── /view ─────────────────────────────────
bot.onText(/\/view/, async (msg) => {
  const chatId = msg.chat.id;
  const name   = spNames[chatId];
  try {
    const all    = await getEntries();
    // Filter to this salesperson if name known
    const mine   = name ? all.filter(e => e.salesperson === name) : all;
    const recent = mine.slice(-5).reverse();

    if (recent.length === 0) {
      return bot.sendMessage(chatId, `📭 No entries yet${name ? ` for ${name}` : ''}. Use /log to add data!`);
    }

    let text = `📊 *Last ${recent.length} Entries${name ? ` (${name})` : ''}:*\n\n`;
    recent.forEach(e => {
      const t = e.totals;
      text += `📅 *${e.date}*\n`;
      e.skuData.forEach(s => {
        text += `  • ${s.name}: ${s.sold} sold, ${s.wasted} wasted → ${formatRM(s.revenue)}\n`;
      });
      text += `💰 Revenue: ${formatRM(t.revenue)} | 📈 GP: ${formatRM(t.grossProfit)} | 🗑️ Wastage: ${formatRM(t.wastageCost)}\n`;
      text += `📊 Margin: ${t.grossMarginPct}%\n`;
      if (e.notes) text += `📝 ${e.notes}\n`;
      text += `\n`;
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

// ── Inline keyboard (date buttons) ────────
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
    session.data.date     = query.data.replace('date:', '');
    session.step          = 'sku';
    session.data.skuIndex = 0;
    bot.sendMessage(chatId, `✅ Date set: *${session.data.date}*`, { parse_mode: 'Markdown' });
    promptSKU(chatId, 0);
  }
});

// ── Multi-step text handler ────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();

  if (!text || text.startsWith('/')) return;

  const session = sessions[chatId];

  // ── 1. If inside a structured session step ─
  if (session) {
    const step = session.step;

    if (step === 'setname') {
      spNames[chatId] = text;
      const afterName  = session.afterName;
      delete sessions[chatId];
      bot.sendMessage(chatId, `✅ Name saved as *${text}*!`, { parse_mode: 'Markdown' });
      if (afterName === 'log') {
        sessions[chatId] = { step: 'date', data: { salesperson: text, skuData: [], skuIndex: 0 } };
        sendDatePicker(chatId);
      }
      return;
    }

    if (step === 'date_custom') {
      const valid = /^\d{4}-\d{2}-\d{2}$/.test(text);
      if (!valid)
        return bot.sendMessage(chatId, `❌ Wrong format. Enter as YYYY-MM-DD\n_e.g. 2025-06-18_`, { parse_mode: 'Markdown' });
      session.data.date     = text;
      session.step          = 'sku';
      session.data.skuIndex = 0;
      bot.sendMessage(chatId, `✅ Date set: *${text}*`, { parse_mode: 'Markdown' });
      promptSKU(chatId, 0);
      return;
    }

    if (step === 'sku') {
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
      return;
    }

    if (step === 'notes') {
      session.data.notes     = text.toLowerCase() === 'skip' ? '' : text;
      session.data.timestamp = new Date().toISOString();
      session.data.totals    = calcTotals(session.data.skuData);

      try {
        await saveEntry(session.data);
        const t = session.data.totals;
        let reply  = `✅ *Saved!*\n\n`;
        reply += `📅 Date: *${session.data.date}*\n`;
        reply += `👤 Salesperson: *${session.data.salesperson}*\n\n`;
        reply += `*SKU Breakdown:*\n`;
        session.data.skuData.forEach(s => {
          reply += `• ${s.name}: ${s.sold} sold, ${s.wasted} wasted → Rev: ${formatRM(s.revenue)} | Wastage: ${formatRM(s.wastageCost)}\n`;
        });
        reply += `\n📊 *Summary:*\n`;
        reply += `💰 Revenue:       ${formatRM(t.revenue)}\n`;
        reply += `📈 Gross Profit:  ${formatRM(t.grossProfit)}\n`;
        reply += `🗑️ Wastage Cost:  ${formatRM(t.wastageCost)}\n`;
        reply += `📊 Net:           ${formatRM(t.netProfit)}\n`;
        reply += `📉 Gross Margin:  ${t.grossMarginPct}%\n`;
        if (session.data.notes) reply += `📝 Notes: ${session.data.notes}\n`;
        reply += `\n_Dashboard updated!_`;

        bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
      } catch (err) {
        bot.sendMessage(chatId, `❌ Failed to save: ${err.message}`);
      }
      delete sessions[chatId];
      return;
    }
  }

  // ── 2. No active session — use Hermes to classify intent ──
  const name   = spNames[chatId] || msg.from?.first_name || 'Unknown';
  const result = await classifyIntent(text, name);

  if (result.intent === 'LOG') {
    if (!spNames[chatId]) {
      sessions[chatId] = { step: 'setname', afterName: 'log' };
      bot.sendMessage(chatId, `👤 Before logging, what's your *name*?`, { parse_mode: 'Markdown' });
    } else {
      sessions[chatId] = { step: 'date', data: { salesperson: spNames[chatId], skuData: [], skuIndex: 0 } };
      sendDatePicker(chatId);
    }
  } else if (result.intent === 'VIEW') {
    bot.sendMessage(chatId, `Use /view to see your recent entries.`);
  } else if (result.intent === 'HELP') {
    bot.sendMessage(chatId,
      `📋 *What I can do:*\n/log — record your sales\n/view — see past entries\n/setname — update your name`,
      { parse_mode: 'Markdown' }
    );
  } else if (result.intent === 'CANCEL') {
    delete sessions[chatId];
    bot.sendMessage(chatId, `❌ Cancelled.`);
  } else {
    bot.sendMessage(chatId,
      `🤔 I'm not sure what you mean. Try /log to record sales or /help for options.`
    );
  }
});

bot.on('polling_error', (err) => console.error('Bot error:', err.message));

// ─────────────────────────────────────────
//  Start
// ─────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`✅ Dashboard → http://localhost:${PORT}`));
  console.log(`🤖 Telegram bot running (Hermes agent enabled)...`);
}

start().catch(err => { console.error('❌ Startup failed:', err.message); process.exit(1); });
