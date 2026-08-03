import { renderSPTable } from '../components/tables.js';
import { renderSPChart } from '../components/charts.js';

export function renderSalesperson({ entries, spChartMetric }) {
  renderSPTable(entries);
  renderSPChart(entries, spChartMetric);
}
