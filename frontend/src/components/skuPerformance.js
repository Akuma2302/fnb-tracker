import { fmtRM } from '../utils/format.js';
import { aggBySKU } from '../utils/aggregate.js';

const SKU_COLORS = [
  '#534AB7', '#1D9E75', '#BA7517', '#378ADD', '#E24B4A',
  '#7C6FE0', '#2FBF91', '#D98A2B', '#5AA6E8', '#E86F6E',
];

export function renderSKUPerf(entries, skuDefs, sortKey = 'revenue') {
  const el = document.getElementById('sku-perf-rows');
  const skus = aggBySKU(entries, skuDefs).sort((a, b) => b[sortKey] - a[sortKey]);
  const maxVal = Math.max(1, ...skus.map((s) => s[sortKey]));

  if (!entries.length) {
    el.innerHTML = '<div class="placeholder">No data for this period.</div>';
    document.getElementById('sku-note').textContent = '';
    return;
  }

  el.innerHTML = skus.map((s, i) => {
    const margin = s.revenue > 0 ? ((s.grossProfit / s.revenue) * 100).toFixed(0) : 0;
    const barPct = Math.round((s[sortKey] / maxVal) * 100);
    return `
      <div class="sku-row">
        <span class="col-name">
          <div class="sku-name">${s.name}</div>
          <div class="sku-price">RM${s.salePrice} · RM${s.costPrice}</div>
        </span>
        <span class="col-bar">
          <div class="bar-wrap"><div class="bar-fill" style="width:${barPct}%;background:${SKU_COLORS[i % SKU_COLORS.length]}"></div></div>
        </span>
        <span class="col-rev sku-rev">${fmtRM(s.revenue)}</span>
        <span class="col-waste sku-waste">${fmtRM(s.wastageCost)}</span>
        <span class="col-margin sku-margin" style="color:${margin >= 20 ? 'var(--green)' : 'var(--amber)'}">${margin}%</span>
      </div>`;
  }).join('');

  const totalNotReceived = skus.reduce((a, s) => a + s.timesNotReceived, 0);
  document.getElementById('sku-note').textContent =
    totalNotReceived > 0 ? `${totalNotReceived} SKU-day(s) marked as not received in this period.` : '';
}
