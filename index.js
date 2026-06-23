require('dotenv').config();
const express        = require('express');
const TelegramBot    = require('node-telegram-bot-api');
const { MongoClient } = require('mongodb');
const path           = require('path');

// ─────────────────────────────────────────
//  CONFIG — edit these values
// ─────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || "8901982392:AAG0arsfB59Yzpf2x8T3LZW2Jgf76B6m7lA";
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://asyraaf2302_db_user:FJFJIu4hzUfpL2AU@cluster0.9jhroj0.mongodb.net/";
const PORT      = process.env.PORT || 3000;

// ─────────────────────────────────────────
//  SKU DEFINITIONS — edit to match your menu
// ─────────────────────────────────────────
const SKUS = [
  { id: 1, name: 'Item A', salePrice: 10.00, costPrice: 7.00  },
  { id: 2, name: 'Item B', salePrice: 15.00, costPrice: 10.00 },
  { id: 3, name: 'Item C', salePrice: 8.00,  costPrice: 4.50  },
  { id: 4, name: 'Item D', salePrice: 12.00, costPrice: 9.00  },
  { id: 5, name: 'Item E', salePrice: 10.00, costPrice: 8.50  },
];

// ─────────────────────────────────────────
//  DAILY TARGETS — edit these values
// ─────────────────────────────────────────
const TARGETS = {
  revenue:      3200,
  units:        320,
  wastageLimit: 500,
};

// ─────────────────────────────────────────
//  CALCULATION HELPERS
// ─────────────────────────────────────────
function calcSKUData(sku, sold, wasted) {
  return {
    id:          sku.id,
    name:        sku.name,
    salePrice:   sku.salePrice,
    costPrice:   sku.costPrice,
    sold,
    wasted,
    revenue:     +(sold * sku.salePrice).toFixed(2),
    grossProfit: +(sold * (sku.salePrice - sku.costPrice)).toFixed(2),
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
//  MONGODB
// ─────────────────────────────────────────
let col;

async function connectDB() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  col = client.db('fnb_tracker').collection('entries');
  // unique per salesperson per date
  await col.createIndex({ date: 1, salesperson: 1 }, { unique: true });
  console.log('✅ MongoDB connected');
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
//  DATE HELPERS
// ─────────────────────────────────────────
function getMYDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
}

function formatRM(val) {
  return `RM ${Number(val).toFixed(2)}`;
}

// ─────────────────────────────────────────
//  EXPRESS SERVER
// ─────────────────────────────────────────
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Dashboard data endpoint — HTML reads this
app.get('/api/data', async (req, res) => {
  try {
    const entries = await getEntries();
    res.json({ entries, skus: SKUS, targets: TARGETS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ─────────────────────────────────────────
//  TELEGRAM BOT
// ─────────────────────────────────────────
const bot      = new TelegramBot(BOT_TOKEN, { polling: true });
const sessions = {};   // active wizard sessions  { [chatId]: { step, data } }
const names    = {};   // remembered names         { [chatId]: 'Akmal' }

// ── Helpers ───────────────────────────────
function sendDatePicker(chatId) {
  const today = getMYDate(0);
  const yest  = getMYDate(1);
  bot.sendMessage(
    chatId,
    'Step 1 — Choose Date\n\nTap a quick option or type your own:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: `Today (${today})`,     callback_data: `date:${today}` },
            { text: `Yesterday (${yest})`,  callback_data: `date:${yest}`  },
          ],
          [{ text: 'Type a different date', callback_data: 'date:custom' }],
        ],
      },
    }
  );
}

function sendSKUPrompt(chatId, idx) {
  const sku  = SKUS[idx];
  const step = idx + 2; // step 2 … N+1
  bot.sendMessage(
    chatId,
    `Step ${step} of ${SKUS.length + 2} — ${sku.name}\n` +
    `Sale: RM${sku.salePrice}  |  Cost: RM${sku.costPrice}\n\n` +
    `Enter sold,wasted (e.g. 25,3)\nType 0,0 if not sold today`
  );
}

// ── /start ────────────────────────────────
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'FnB Daily Tracker\n\n' +
    '/log      — Log daily sales\n' +
    '/view     — View your last 5 entries\n' +
    '/setname  — Change your name\n' +
    '/cancel   — Cancel current entry\n' +
    '/help     — Show this menu'
  );
});

// ── /help ─────────────────────────────────
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    'Commands:\n\n' +
    '/log      — Log daily sales by SKU\n' +
    '/view     — View last 5 entries\n' +
    '/setname  — Update your name\n' +
    '/cancel   — Cancel current entry'
  );
});

// ── /setname ──────────────────────────────
bot.onText(/\/setname/, (msg) => {
  const chatId = msg.chat.id;
  sessions[chatId] = { step: 'setname', data: {} };
  bot.sendMessage(chatId, 'What is your name?');
});

// ── /log ──────────────────────────────────
bot.onText(/\/log/, (msg) => {
  const chatId = msg.chat.id;
  if (!names[chatId]) {
    // First time — ask for name, then auto-start log
    sessions[chatId] = { step: 'setname', data: { next: 'log' } };
    bot.sendMessage(chatId, 'First, what is your name? Type it below:');
    return;
  }
  // Name already known — go straight to date picker
  sessions[chatId] = {
    step: 'date',
    data: { salesperson: names[chatId], skuData: [], skuIndex: 0 },
  };
  sendDatePicker(chatId);
});

// ── /view ─────────────────────────────────
bot.onText(/\/view/, async (msg) => {
  const chatId = msg.chat.id;
  const name   = names[chatId];
  try {
    const all    = await getEntries();
    const mine   = name ? all.filter(e => e.salesperson === name) : all;
    const recent = mine.slice(-5).reverse();

    if (!recent.length) {
      return bot.sendMessage(chatId, 'No entries yet. Use /log to add data!');
    }

    let text = `Last ${recent.length} entries${name ? ` for ${name}` : ''}:\n\n`;
    recent.forEach(e => {
      const t = e.totals;
      text += `${e.date}\n`;
      (e.skuData || []).forEach(s => {
        text += `  ${s.name}: ${s.sold} sold, ${s.wasted} wasted — ${formatRM(s.revenue)}\n`;
      });
      text += `Revenue: ${formatRM(t.revenue)} | GP: ${formatRM(t.grossProfit)} | Waste: ${formatRM(t.wastageCost)} | ${t.grossMarginPct}%\n\n`;
    });

    bot.sendMessage(chatId, text);
  } catch (err) {
    bot.sendMessage(chatId, `Error: ${err.message}`);
  }
});

// ── /cancel ───────────────────────────────
bot.onText(/\/cancel/, (msg) => {
  delete sessions[msg.chat.id];
  bot.sendMessage(msg.chat.id, 'Entry cancelled.');
});

// ── Date button handler ───────────────────
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;

  // Always dismiss the spinner first
  try { await bot.answerCallbackQuery(query.id); } catch (_) {}

  const session = sessions[chatId];
  if (!session) {
    bot.sendMessage(chatId, 'Session expired. Use /log to start again.');
    return;
  }

  if (!query.data.startsWith('date:')) return;

  if (query.data === 'date:custom') {
    session.step = 'date_custom';
    bot.sendMessage(chatId, 'Type the date in YYYY-MM-DD format:\ne.g. 2025-06-18');
    return;
  }

  // Today or Yesterday was tapped
  const chosen          = query.data.replace('date:', '');
  session.data.date     = chosen;
  session.data.skuIndex = 0;
  session.step          = 'sku';

  bot.sendMessage(chatId, `Date set: ${chosen}`);
  sendSKUPrompt(chatId, 0);
});

// ── Text message handler ──────────────────
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text   = (msg.text || '').trim();

  // Ignore commands and empty messages
  if (!text || text.startsWith('/')) return;

  const session = sessions[chatId];
  if (!session) return;

  const steps = {

    // ── Step: collect name ─────────────────
    setname() {
      names[chatId] = text;
      bot.sendMessage(chatId, `Name saved as ${text}!`);

      if (session.data.next === 'log') {
        // Auto-continue to log flow
        sessions[chatId] = {
          step: 'date',
          data: { salesperson: text, skuData: [], skuIndex: 0 },
        };
        sendDatePicker(chatId);
      } else {
        delete sessions[chatId];
      }
    },

    // ── Step: waiting for date picker tap ──
    date() {
      bot.sendMessage(chatId, 'Please tap one of the date buttons above, or tap "Type a different date".');
    },

    // ── Step: typed custom date ────────────
    date_custom() {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        bot.sendMessage(chatId, 'Wrong format. Please enter as YYYY-MM-DD\ne.g. 2025-06-18');
        return;
      }
      session.data.date     = text;
      session.data.skuIndex = 0;
      session.step          = 'sku';
      bot.sendMessage(chatId, `Date set: ${text}`);
      sendSKUPrompt(chatId, 0);
    },

    // ── Step: enter sold,wasted per SKU ────
    sku() {
      const parts = text.split(',').map(s => parseInt(s.trim(), 10));
      if (parts.length !== 2 || parts.some(isNaN) || parts.some(v => v < 0)) {
        bot.sendMessage(chatId, 'Enter two numbers separated by comma.\ne.g. 25,3\nType 0,0 if not sold today');
        return;
      }

      const [sold, wasted] = parts;
      const sku = SKUS[session.data.skuIndex];
      session.data.skuData.push(calcSKUData(sku, sold, wasted));
      session.data.skuIndex++;

      if (session.data.skuIndex < SKUS.length) {
        // More SKUs to enter
        sendSKUPrompt(chatId, session.data.skuIndex);
      } else {
        // All SKUs done — ask for notes
        session.step = 'notes';
        bot.sendMessage(chatId, `Last step — any notes for today?\nType skip to leave empty`);
      }
    },

    // ── Step: notes then save ──────────────
    async notes() {
      session.data.notes     = text.toLowerCase() === 'skip' ? '' : text;
      session.data.timestamp = new Date().toISOString();
      session.data.totals    = calcTotals(session.data.skuData);

      try {
        await saveEntry(session.data);

        const t = session.data.totals;
        let reply = `Saved!\n\n`;
        reply += `Date: ${session.data.date}\n`;
        reply += `Salesperson: ${session.data.salesperson}\n\n`;
        reply += `SKU Breakdown:\n`;
        session.data.skuData.forEach(s => {
          reply += `${s.name}: ${s.sold} sold, ${s.wasted} wasted\n`;
          reply += `  Revenue: ${formatRM(s.revenue)} | GP: ${formatRM(s.grossProfit)} | Waste: ${formatRM(s.wastageCost)}\n`;
        });
        reply += `\nSummary:\n`;
        reply += `Revenue:      ${formatRM(t.revenue)}\n`;
        reply += `Gross Profit: ${formatRM(t.grossProfit)}\n`;
        reply += `Wastage:      ${formatRM(t.wastageCost)}\n`;
        reply += `Net Profit:   ${formatRM(t.netProfit)}\n`;
        reply += `Margin:       ${t.grossMarginPct}%`;
        if (session.data.notes) reply += `\nNotes: ${session.data.notes}`;

        bot.sendMessage(chatId, reply);
      } catch (err) {
        bot.sendMessage(chatId, `Failed to save: ${err.message}`);
      }

      delete sessions[chatId];
    },
  };

  if (steps[session.step]) await steps[session.step]();
});

bot.on('polling_error', (err) => console.error('Polling error:', err.message));

// ─────────────────────────────────────────
//  START
// ─────────────────────────────────────────
async function start() {
  await connectDB();
  app.listen(PORT, () => console.log(`✅ Dashboard running at http://localhost:${PORT}`));
  console.log('✅ Telegram bot running...');
}

start().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
