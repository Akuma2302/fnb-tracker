import { renderMetricsGrid } from '../components/metrics.js';
import { renderDailyTargets } from '../components/dailyTargets.js';
import { renderSKUPerf } from '../components/skuPerformance.js';
import { renderSPLeaderboard } from '../components/leaderboard.js';
import { renderLogTable } from '../components/tables.js';
import { renderRevenueChart, renderSKUBarChart } from '../components/charts.js';

export function renderOverview({ entries, skuDefs, targets, skuSort }) {
  renderMetricsGrid(entries, targets);
  renderDailyTargets(entries, targets);
  renderSKUPerf(entries, skuDefs, skuSort);
  renderSPLeaderboard(entries);
  renderRevenueChart(entries);
  renderSKUBarChart(entries, skuDefs);
  renderLogTable(entries);
}
