// ─────────────────────────────────────────
//  ENTRY DOCUMENT SHAPE (MongoDB is schema-less,
//  this file documents the shape used across the app)
// ─────────────────────────────────────────
//
// {
//   date:        'YYYY-MM-DD',
//   salesperson: 'Amir',
//   skuData: [
//     {
//       id, name, salePrice, costPrice,
//       received,      // boolean — did the salesperson receive stock today?
//       sold, wasted,
//       revenue, grossProfit, wastageCost,
//     },
//     ...
//   ],
//   totals: {
//     revenue, grossProfit, wastageCost, netProfit,
//     grossMarginPct, totalSold, totalWasted,
//   },
//   notes: '',
//   timestamp: ISOString,
// }

module.exports = {};
