import { renderWastageMetrics } from '../components/wastageMetrics.js';
import { renderWastageChart, renderWastageSKUChart } from '../components/charts.js';

export function renderWastage({ entries, skuDefs, targets }) {
  renderWastageMetrics(entries, targets);
  renderWastageChart(entries, targets);
  renderWastageSKUChart(entries, skuDefs);
}
