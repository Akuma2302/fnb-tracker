/**
 * Aggregates revenue / GP / wastage / units per SKU across a set of entries.
 */
export function aggBySKU(entries, skuDefs) {
  const map = {};
  skuDefs.forEach((sku) => {
    map[sku.name] = {
      name: sku.name,
      salePrice: sku.salePrice,
      costPrice: sku.costPrice,
      image: sku.image,
      revenue: 0,
      grossProfit: 0,
      wastageCost: 0,
      sold: 0,
      wasted: 0,
      timesReceived: 0,
      timesNotReceived: 0,
    };
  });

  entries.forEach((e) => {
    (e.skuData || []).forEach((s) => {
      if (!map[s.name]) return;
      map[s.name].revenue += s.revenue || 0;
      map[s.name].grossProfit += s.grossProfit || 0;
      map[s.name].wastageCost += s.wastageCost || 0;
      map[s.name].sold += s.sold || 0;
      map[s.name].wasted += s.wasted || 0;
      if (s.received) map[s.name].timesReceived++;
      else map[s.name].timesNotReceived++;
    });
  });

  return Object.values(map);
}

/**
 * Aggregates totals per salesperson across a set of entries.
 */
export function aggBySP(entries) {
  const map = {};
  entries.forEach((e) => {
    const key = e.salesperson || 'Unknown';
    if (!map[key]) {
      map[key] = { name: key, revenue: 0, grossProfit: 0, wastageCost: 0, sold: 0, days: 0 };
    }
    const t = e.totals || {};
    map[key].revenue += t.revenue || 0;
    map[key].grossProfit += t.grossProfit || 0;
    map[key].wastageCost += t.wastageCost || 0;
    map[key].sold += t.totalSold || 0;
    map[key].days += 1;
  });
  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
}
