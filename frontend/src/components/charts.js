import { fmtShort } from '../utils/format.js';
import { aggBySKU, aggBySP } from '../utils/aggregate.js';

const SKU_COLORS = ['#534AB7', '#1D9E75', '#BA7517', '#378ADD', '#E24B4A', '#7C6FE0', '#2FBF91', '#D98A2B', '#5AA6E8', '#E86F6E'];
const SP_COLORS = [
  { bg: '#EEEDFE', fg: '#534AB7' }, { bg: '#E1F5EE', fg: '#1D9E75' }, { bg: '#FAEEDA', fg: '#BA7517' },
  { bg: '#E8F2FC', fg: '#378ADD' }, { bg: '#FDEAEA', fg: '#E24B4A' }, { bg: '#F0F0F2', fg: '#52525B' },
];

const charts = {}; // holds live Chart.js instances so we can destroy/recreate on re-render

const baseOpts = {
  responsive: true,
  plugins: { legend: { labels: { color: '#71717A', font: { size: 11 } } } },
  scales: {
    x: { ticks: { color: '#A1A1AA', font: { size: 10 } }, grid: { color: '#F0F0F2' } },
    y: { ticks: { color: '#A1A1AA', font: { size: 10 } }, grid: { color: '#F0F0F2' } },
  },
};

function makeChart(key, canvasId, config) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[key]) charts[key].destroy();
  charts[key] = new Chart(canvas.getContext('2d'), config);
}

function sizeChartWrapper(wrapperId, pointCount, pxPerPoint, minWidth) {
  const wrapper = document.getElementById(wrapperId);
  if (!wrapper) return;
  const needed = pointCount * pxPerPoint;
  wrapper.style.width = needed > minWidth ? `${needed}px` : '100%';
}

const scrollChartOpts = { ...baseOpts, maintainAspectRatio: false };

export function renderRevenueChart(entries) {
  const labels = [...new Set(entries.map((e) => e.date))].sort();
  const dayRev = labels.map((d) => entries.filter((e) => e.date === d).reduce((a, e) => a + (e.totals?.revenue || 0), 0));
  const dayGP = labels.map((d) => entries.filter((e) => e.date === d).reduce((a, e) => a + (e.totals?.grossProfit || 0), 0));

  makeChart('revenue', 'revenueChart', {
    type: 'line',
    data: {
      labels: labels.map(fmtShort),
      datasets: [
        { label: 'Revenue', data: dayRev, borderColor: '#1D9E75', backgroundColor: 'rgba(29,158,117,0.12)', fill: true, tension: 0.3 },
        { label: 'Gross Profit', data: dayGP, borderColor: '#534AB7', borderDash: [5, 3], fill: false, tension: 0.3 },
      ],
    },
    options: baseOpts,
  });
}

export function renderSKUBarChart(entries, skuDefs) {
  const skus = aggBySKU(entries, skuDefs);
  makeChart('skuBar', 'skuChart', {
    type: 'bar',
    data: {
      labels: skus.map((s) => s.name),
      datasets: [
        { label: 'Revenue', data: skus.map((s) => +s.revenue.toFixed(2)), backgroundColor: 'rgba(29,158,117,0.7)' },
        { label: 'Gross Profit', data: skus.map((s) => +s.grossProfit.toFixed(2)), backgroundColor: 'rgba(83,74,183,0.5)' },
        { label: 'Wastage', data: skus.map((s) => +s.wastageCost.toFixed(2)), backgroundColor: 'rgba(226,75,74,0.5)' },
      ],
    },
    options: baseOpts,
  });
}

export function renderSKUTrendChart(entries, skuDefs) {
  const labels = [...new Set(entries.map((e) => e.date))].sort();
  const skus = aggBySKU(entries, skuDefs).slice(0, 6);

  makeChart('skuTrend', 'skuTrendChart', {
    type: 'line',
    data: {
      labels: labels.map(fmtShort),
      datasets: skus.map((s, i) => ({
        label: s.name,
        data: labels.map((d) => entries.filter((e) => e.date === d)
          .reduce((a, e) => a + (e.skuData || []).filter((x) => x.name === s.name).reduce((b, x) => b + x.revenue, 0), 0)),
        borderColor: SKU_COLORS[i % SKU_COLORS.length],
        fill: false,
        tension: 0.3,
      })),
    },
    options: baseOpts,
  });
}

export function renderSPChart(entries) {
  const sps = aggBySP(entries);
  makeChart('sp', 'spChart', {
    type: 'bar',
    data: {
      labels: sps.map((s) => s.name),
      datasets: [
        { label: 'Revenue', data: sps.map((s) => +s.revenue.toFixed(2)), backgroundColor: sps.map((_, i) => SP_COLORS[i % SP_COLORS.length].fg + 'CC') },
        { label: 'Gross Profit', data: sps.map((s) => +s.grossProfit.toFixed(2)), backgroundColor: 'rgba(83,74,183,0.5)' },
        { label: 'Wastage', data: sps.map((s) => +s.wastageCost.toFixed(2)), backgroundColor: 'rgba(226,75,74,0.5)' },
      ],
    },
    options: baseOpts,
  });
}

export function renderWastageChart(entries, targets) {
  const labels = [...new Set(entries.map((e) => e.date))].sort();
  const dayWc = labels.map((d) => entries.filter((e) => e.date === d).reduce((a, e) => a + (e.totals?.wastageCost || 0), 0));

  makeChart('wastage', 'wastageChart', {
    type: 'bar',
    data: {
      labels: labels.map(fmtShort),
      datasets: [
        { label: 'Wastage Cost', data: dayWc, backgroundColor: 'rgba(226,75,74,0.7)' },
        { label: 'Daily Limit', data: labels.map(() => targets.wastageLimit), type: 'line', borderColor: '#BA7517', borderDash: [5, 3], pointRadius: 0, fill: false },
      ],
    },
    options: baseOpts,
  });
}

export function renderWastageSKUChart(entries, skuDefs) {
  const skus = aggBySKU(entries, skuDefs);
  makeChart('wastageSku', 'wastageSkuChart', {
    type: 'doughnut',
    data: {
      labels: skus.map((s) => s.name),
      datasets: [{ data: skus.map((s) => +s.wastageCost.toFixed(2)), backgroundColor: SKU_COLORS.concat(SKU_COLORS) }],
    },
    options: { responsive: true, plugins: { legend: { labels: { color: '#71717A', font: { size: 11 } } } } },
  });
}

export function renderTargetChart(allEntries, targets) {
  const labels = [...new Set(allEntries.map((e) => e.date))].sort();
  const dayRev = labels.map((d) => allEntries.filter((e) => e.date === d).reduce((a, e) => a + (e.totals?.revenue || 0), 0));

  makeChart('target', 'targetChart', {
    type: 'bar',
    data: {
      labels: labels.map(fmtShort),
      datasets: [
        { label: 'Actual Revenue', data: dayRev, backgroundColor: 'rgba(83,74,183,0.7)' },
        { label: 'Target', data: labels.map(() => targets.revenue), type: 'line', borderColor: '#E24B4A', borderDash: [5, 3], pointRadius: 0, fill: false },
      ],
    },
    options: baseOpts,
  });
}
