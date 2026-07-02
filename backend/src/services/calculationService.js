/**
 * Builds the calculated record for a single SKU entry.
 * `received` tracks whether the salesperson confirmed they received
 * stock for this item today — if not, sold/wasted default to 0.
 */
function calcSKUData(sku, received, sold = 0, wasted = 0) {
  return {
    id: sku.id,
    name: sku.name,
    salePrice: sku.salePrice,
    costPrice: sku.costPrice,
    image: sku.image,
    received,
    sold,
    wasted,
    revenue: +(sold * sku.salePrice).toFixed(2),
    grossProfit: +(sold * (sku.salePrice - sku.costPrice)).toFixed(2),
    wastageCost: +(wasted * sku.costPrice).toFixed(2),
  };
}

/**
 * Rolls up totals across all SKU rows for one entry.
 */
function calcTotals(skuData) {
  const revenue = skuData.reduce((a, s) => a + s.revenue, 0);
  const grossProfit = skuData.reduce((a, s) => a + s.grossProfit, 0);
  const wastageCost = skuData.reduce((a, s) => a + s.wastageCost, 0);

  return {
    revenue: +revenue.toFixed(2),
    grossProfit: +grossProfit.toFixed(2),
    wastageCost: +wastageCost.toFixed(2),
    netProfit: +(grossProfit - wastageCost).toFixed(2),
    grossMarginPct: revenue > 0 ? +((grossProfit / revenue) * 100).toFixed(1) : 0,
    totalSold: skuData.reduce((a, s) => a + s.sold, 0),
    totalWasted: skuData.reduce((a, s) => a + s.wasted, 0),
  };
}

module.exports = { calcSKUData, calcTotals };
