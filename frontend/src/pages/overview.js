import { renderMetricsGrid } from '../components/metrics.js';
import { renderDailyTargets } from '../components/dailyTargets.js';
import { renderSKUPerf } from '../components/skuPerformance.js';
import { renderSPLeaderboard } from '../components/leaderboard.js';
import { renderRevenueChart, renderSKURevenueChart, renderSKUGPChart, renderSKUWastageChart } from '../components/charts.js';

export function renderOverview({ entries, skuDefs, targets, skuSort }) {
  renderMetricsGrid(entries, targets);
  renderDailyTargets(entries, targets);
  renderSKUPerf(entries, skuDefs, skuSort);
  renderSPLeaderboard(entries);
  renderRevenueChart(entries);
  renderSKURevenueChart(entries, skuDefs);
  renderSKUGPChart(entries, skuDefs);
  renderSKUWastageChart(entries, skuDefs);
}
