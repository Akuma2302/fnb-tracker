import { fmtRM, fmtNum } from '../utils/format.js';
import { aggBySKU } from '../utils/aggregate.js';

const SKU_COLORS = [
  '#534AB7', '#1D9E75', '#BA7517', '#378ADD', '#E24B4A',
  '#7C6FE0', '#2FBF91', '#D98A2B', '#5AA6E8', '#E86F6E',
];

const METRICS = {
  revenue:     { label: 'Revenue',      unit: 'rm'  },
  grossProfit: { label: 'Gross Profit', unit: 'rm'  },
  margin:      { label: 'Margin',       unit: 'pct' },
  wastageCost: { label: 'Wastage',      unit: 'rm'  },
  sold:        { label: 'Units Sold',   unit: 'num' },
  wasted:      { label: 'Units Wasted', unit: 'num' },
};

function formatMetric(unit, val) {
  if (unit === 'rm') return fmtRM(val);
  if (unit === 'pct') return `${val.toFixed(0)}%`;
  return fmtNum(val);
}

export function renderSKUPerf(entries, skuDefs, metricKey = 'revenue') {
  const el = document.getElementById('sku-perf-rows');
  const headerEl = document.getElementById('sku-perf-header');
  const metric = METRICS[metricKey] || METRICS.revenue;

  headerEl.innerHTML = `
    <span class="col-name">SKU</span>
    <span class="col-bar"></span>
    <span class="col-metric">${metric.label}</span>`;

  const skus = aggBySKU(entries, skuDefs)
    .map((s) => ({ ...s, margin: s.revenue > 0 ? (s.grossProfit / s.revenue) * 100 : 0 }))
    .sort((a, b) => b[metricKey] - a[metricKey]);

  if (!entries.length) {
    el.innerHTML = '<div class="placeholder">No data for this period.</div>';
    document.getElementById('sku-note').textContent = '';
    return;
  }

  const maxVal = Math.max(1, ...skus.map((s) => s[metricKey]));

  el.innerHTML = skus.map((s, i) => {
    const barPct = Math.round((s[metricKey] / maxVal) * 100);
    const valColor = metricKey === 'wastageCost' ? 'var(--red)'
      : metricKey === 'margin' ? (s.margin >= 20 ? 'var(--green)' : 'var(--amber)')
      : 'var(--text)';

    return `
      <div class="sku-row">
        <span class="col-name">
          <div class="sku-name">${s.name}</div>
          <div class="sku-price">RM${s.salePrice} · RM${s.costPrice}</div>
        </span>
        <span class="col-bar">
          <div class="bar-wrap"><div class="bar-fill" style="width:${barPct}%;background:${SKU_COLORS[i % SKU_COLORS.length]}"></div></div>
        </span>
        <span class="col-metric sku-metric-val" style="color:${valColor}">${formatMetric(metric.unit, s[metricKey])}</span>
      </div>`;
  }).join('');

  const totalNotReceived = skus.reduce((a, s) => a + s.timesNotReceived, 0);
  document.getElementById('sku-note').textContent =
    totalNotReceived > 0 ? `${totalNotReceived} SKU-day(s) marked as not received in this period.` : '';
}