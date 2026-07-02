const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');

const { env } = require('../config/env');
const SKUS = require('../models/skuModel');
const entryRepository = require('../repositories/entryRepository');
const { calcSKUData, calcTotals } = require('./calculationService');
const { getLocalDate } = require('../utils/dateUtils');
const { formatRM } = require('../utils/formatUtils');
const { parseSoldWasted, validateDate } = require('../validators/entryValidator');
const logger = require('../utils/logger');

// Images live in frontend/public/assets/items (shared with the dashboard)
const ASSETS_DIR = path.join(__dirname, '../../../frontend/public/assets/items');

let bot;
const sessions = {}; // active wizard sessions  { [chatId]: { step, data } }
const names = {};    // remembered names         { [chatId]: 'Akmal' }

// ── Helpers ───────────────────────────────
function sendDatePicker(chatId) {
  const today = getLocalDate(0);
  const yest = getLocalDate(1);
  bot.sendMessage(
    chatId,
    'Step 1 — Choose Date\n\nTap a quick option or type your own:',
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: `Today (${today})`, callback_data: `date:${today}` },
            { text: `Yesterday (${yest})`, callback_data: `date:${yest}` },
          ],
          [{ text: 'Type a different date', callback_data: 'date:custom' }],
        ],
      },
    }
  );
}

function imagePathFor(sku) {
  const fileName = path.basename(sku.image || '');
  const filePath = path.join(ASSETS_DIR, fileName);
  return fs.existsSync(filePath) ? filePath : null;
}

/**
 * Sends the "did you receive this item today?" prompt with a photo of the item.
 */
async function sendReceivePrompt(chatId, idx) {
  const sku = SKUS[idx];
  const step = idx + 2; // step 2 … N+1
  const caption =
    `Step ${step} of ${SKUS.length + 1} — ${sku.name}\n` +
    `Sale: RM${sku.salePrice}  |  Cost: RM${sku.costPrice}\n\n` +
    `Did you receive ${sku.name} today?`;

  const keyboard = {
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Yes', callback_data: `recv:yes:${idx}` },
        { text: '❌ No', callback_data: `recv:no:${idx}` },
      ]],
    },
  };

  const imgPath = imagePathFor(sku);
  try {
    if (imgPath) {
      await bot.sendPhoto(chatId, fs.createReadStream(imgPath), { caption, ...keyboard });
    } else {
      await bot.sendMessage(chatId, caption, keyboard);
    }
  } catch (err) {
    logger.error('Failed to send SKU photo, falling back to text:', err.message);
    await bot.sendMessage(chatId, caption, keyboard);
  }
}

function sendQtyPrompt(chatId, idx) {
  const sku = SKUS[idx];
  bot.sendMessage(
    chatId,
    `${sku.name} — enter sold,wasted (e.g. 25,3)\nType 0,0 if not sold today`
  );
}

/**
 * Moves the wizard to the next SKU, or to notes if all SKUs are done.
 */
function advanceToNextSKU(chatId, session) {
  if (session.data.skuIndex < SKUS.length) {
    session.step = 'receive';
    sendReceivePrompt(chatId, session.data.skuIndex);
  } else {
    session.step = 'notes';
    bot.sendMessage(chatId, 'Last step — any notes for today?\nType skip to leave empty');
  }
}

// ── Command handlers ──────────────────────
function registerCommands() {
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

  bot.onText(/\/setname/, (msg) => {
    const chatId = msg.chat.id;
    sessions[chatId] = { step: 'setname', data: {} };
    bot.sendMessage(chatId, 'What is your name?');
  });

  bot.onText(/\/log/, (msg) => {
    const chatId = msg.chat.id;
    if (!names[chatId]) {
      sessions[chatId] = { step: 'setname', data: { next: 'log' } };
      bot.sendMessage(chatId, 'First, what is your name? Type it below:');
      return;
    }
    sessions[chatId] = {
      step: 'date',
      data: { salesperson: names[chatId], skuData: [], skuIndex: 0 },
    };
    sendDatePicker(chatId);
  });

  bot.onText(/\/view/, async (msg) => {
    const chatId = msg.chat.id;
    const name = names[chatId];
    try {
      const recent = name
        ? await entryRepository.getEntriesBySalesperson(name, 5)
        : (await entryRepository.getAllEntries()).slice(-5).reverse();

      if (!recent.length) {
        return bot.sendMessage(chatId, 'No entries yet. Use /log to add data!');
      }

      let text = `Last ${recent.length} entries${name ? ` for ${name}` : ''}:\n\n`;
      recent.forEach((e) => {
        const t = e.totals;
        text += `${e.date}\n`;
        (e.skuData || []).forEach((s) => {
          if (!s.received) {
            text += `  ${s.name}: not received today\n`;
            return;
          }
          text += `  ${s.name}: ${s.sold} sold, ${s.wasted} wasted — ${formatRM(s.revenue)}\n`;
        });
        text += `Revenue: ${formatRM(t.revenue)} | GP: ${formatRM(t.grossProfit)} | Waste: ${formatRM(t.wastageCost)} | ${t.grossMarginPct}%\n\n`;
      });

      bot.sendMessage(chatId, text);
    } catch (err) {
      bot.sendMessage(chatId, `Error: ${err.message}`);
    }
  });

  bot.onText(/\/cancel/, (msg) => {
    delete sessions[msg.chat.id];
    bot.sendMessage(msg.chat.id, 'Entry cancelled.');
  });
}

// ── Callback query (inline button taps) ───
function registerCallbackHandler() {
  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    try { await bot.answerCallbackQuery(query.id); } catch (_) { /* ignore */ }

    const session = sessions[chatId];
    if (!session) {
      bot.sendMessage(chatId, 'Session expired. Use /log to start again.');
      return;
    }

    // ── Date buttons ──
    if (query.data.startsWith('date:')) {
      if (query.data === 'date:custom') {
        session.step = 'date_custom';
        bot.sendMessage(chatId, 'Type the date in YYYY-MM-DD format:\ne.g. 2025-06-18');
        return;
      }
      const chosen = query.data.replace('date:', '');
      session.data.date = chosen;
      session.data.skuIndex = 0;
      bot.sendMessage(chatId, `Date set: ${chosen}`);
      advanceToNextSKU(chatId, session);
      return;
    }

    // ── Received Yes/No buttons ──
    if (query.data.startsWith('recv:')) {
      const [, answer, idxStr] = query.data.split(':');
      const idx = Number(idxStr);
      if (idx !== session.data.skuIndex) return; // stale button tap, ignore

      const sku = SKUS[idx];

      if (answer === 'no') {
        session.data.skuData.push(calcSKUData(sku, false, 0, 0));
        session.data.skuIndex++;
        advanceToNextSKU(chatId, session);
        return;
      }

      // answer === 'yes'
      session.step = 'sku_qty';
      sendQtyPrompt(chatId, idx);
    }
  });
}

// ── Text message handler ──────────────────
function registerMessageHandler() {
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = (msg.text || '').trim();
    if (!text || text.startsWith('/')) return;

    const session = sessions[chatId];
    if (!session) return;

    const steps = {
      setname() {
        names[chatId] = text;
        bot.sendMessage(chatId, `Name saved as ${text}!`);

        if (session.data.next === 'log') {
          sessions[chatId] = {
            step: 'date',
            data: { salesperson: text, skuData: [], skuIndex: 0 },
          };
          sendDatePicker(chatId);
        } else {
          delete sessions[chatId];
        }
      },

      date() {
        bot.sendMessage(chatId, 'Please tap one of the date buttons above, or tap "Type a different date".');
      },

      date_custom() {
        if (!validateDate(text)) {
          bot.sendMessage(chatId, 'Wrong format. Please enter as YYYY-MM-DD\ne.g. 2025-06-18');
          return;
        }
        session.data.date = text;
        session.data.skuIndex = 0;
        bot.sendMessage(chatId, `Date set: ${text}`);
        advanceToNextSKU(chatId, session);
      },

      receive() {
        bot.sendMessage(chatId, 'Please tap ✅ Yes or ❌ No above.');
      },

      sku_qty() {
        const { valid, sold, wasted } = parseSoldWasted(text);
        if (!valid) {
          bot.sendMessage(chatId, 'Enter two numbers separated by comma.\ne.g. 25,3\nType 0,0 if not sold today');
          return;
        }

        const sku = SKUS[session.data.skuIndex];
        session.data.skuData.push(calcSKUData(sku, true, sold, wasted));
        session.data.skuIndex++;
        advanceToNextSKU(chatId, session);
      },

      async notes() {
        session.data.notes = text.toLowerCase() === 'skip' ? '' : text;
        session.data.timestamp = new Date().toISOString();
        session.data.totals = calcTotals(session.data.skuData);

        try {
          await entryRepository.saveEntry(session.data);

          const t = session.data.totals;
          let reply = 'Saved!\n\n';
          reply += `Date: ${session.data.date}\n`;
          reply += `Salesperson: ${session.data.salesperson}\n\n`;
          reply += 'SKU Breakdown:\n';
          session.data.skuData.forEach((s) => {
            if (!s.received) {
              reply += `${s.name}: not received today\n`;
              return;
            }
            reply += `${s.name}: ${s.sold} sold, ${s.wasted} wasted\n`;
            reply += `  Revenue: ${formatRM(s.revenue)} | GP: ${formatRM(s.grossProfit)} | Waste: ${formatRM(s.wastageCost)}\n`;
          });
          reply += '\nSummary:\n';
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
}

/**
 * Initialises and starts the Telegram bot (polling mode).
 */
function startBot() {
  bot = new TelegramBot(env.BOT_TOKEN, { polling: true });
  registerCommands();
  registerCallbackHandler();
  registerMessageHandler();
  bot.on('polling_error', (err) => logger.error('Polling error:', err.message));
  logger.info('Telegram bot running...');
  return bot;
}

module.exports = { startBot };
