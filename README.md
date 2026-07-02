# FnB Daily Tracker

Telegram bot + multi-salesperson executive dashboard for tracking daily
sales, wastage, and stock-received status across 20 SKUs.

## What changed in this version

- **20 SKUs**, each with its own photo (`frontend/public/assets/items/`).
- Bot now asks **"Did you receive this item today? Yes/No"** for every SKU
  before asking for sold/wasted quantities. If "No", that SKU is recorded as
  not received (0 sold, 0 wasted) and the bot moves straight to the next item.
- Every number on the dashboard (revenue, units, wastage) now uses **thousand
  separators**, e.g. `RM 14,241.00`.
- **Daily Targets** now appears above **SKU Performance** on the Executive
  Overview tab.
- The **SKU Deep-Dive** tab shows an image card per SKU in a responsive grid —
  4 columns on desktop, narrowing down to **2 columns on mobile**.
- Project reorganised into a clean `backend/` + `frontend/` structure.

## Folder structure

```
fnb-tracker/
├── backend/
│   ├── server.js                 # entry point (connects DB, starts bot + server)
│   ├── .env.example
│   ├── .env                      # your real secrets (gitignored)
│   └── src/
│       ├── config/                # env.js, db.js
│       ├── controllers/           # dashboardController.js, healthController.js
│       ├── routes/                # dashboardRoutes.js, healthRoutes.js
│       ├── services/              # calculationService.js, dashboardService.js, telegramBotService.js
│       ├── middlewares/           # errorHandler.js
│       ├── models/                # skuModel.js (20 SKUs), targetModel.js, entryModel.js
│       ├── repositories/          # entryRepository.js (MongoDB access)
│       ├── utils/                 # logger.js, dateUtils.js, formatUtils.js
│       └── validators/            # entryValidator.js
│
└── frontend/
    ├── public/
    │   ├── index.html
    │   ├── styles.css
    │   └── assets/items/          # item-a.png … item-t.png (20 placeholder photos)
    └── src/
        ├── main.js                 # app state + render orchestration
        ├── services/api.js         # fetch('/api/data')
        ├── layout/header.js
        ├── pages/                  # overview.js, skuDeepDive.js, salesperson.js, wastage.js, targets.js
        ├── components/             # metrics.js, dailyTargets.js, skuPerformance.js, leaderboard.js,
        │                           # itemGrid.js, tables.js, charts.js, wastageMetrics.js
        └── utils/                  # format.js, dateFilter.js, aggregate.js
```

The backend serves `frontend/public` as the static site root and
`frontend/src` under `/src` so the browser can load the ES modules directly —
no bundler/build step required.

## Setup

1. **Install dependencies**
   ```bash
   npm run install:all
   ```

2. **Configure environment variables**

   `backend/.env` already contains the bot token and Mongo URI that were in
   your original `index.js`. ⚠️ **Rotate that Telegram bot token in
   [@BotFather](https://t.me/BotFather) and reset your MongoDB Atlas user
   password** — they were hardcoded in a file you uploaded, so treat them as
   compromised. Then update `backend/.env` with the new values.

   ```
   BOT_TOKEN=your_new_token
   MONGO_URI=your_new_connection_string
   PORT=3000
   TIMEZONE=Asia/Kuala_Lumpur
   ```

3. **Run**
   ```bash
   npm start
   ```
   - Dashboard: http://localhost:3000
   - Telegram bot: polling starts automatically

## SKUs, prices, and images

Edit `backend/src/models/skuModel.js` to change item names, sale/cost prices,
or the 20 SKUs themselves. Each SKU's `image` path points at a file in
`frontend/public/assets/items/` — replace the placeholder PNGs with real
product photos (keep the same file names, or update the `image` path).

## Daily targets

Edit `backend/src/models/targetModel.js` to change revenue/units/wastage
targets shown on the dashboard.

## Bot flow (per salesperson, per day)

1. `/log` → pick date (today / yesterday / custom)
2. For each of the 20 SKUs:
   - Bot sends the item's photo and asks **Yes/No** — did you receive it today?
   - **No** → recorded as not received, moves to next item.
   - **Yes** → bot asks `sold,wasted` (e.g. `25,3`), then moves to next item.
3. Optional notes
4. Entry is saved (one document per salesperson per date, upserted)

Other commands: `/view` (last 5 entries), `/setname`, `/cancel`, `/help`.
