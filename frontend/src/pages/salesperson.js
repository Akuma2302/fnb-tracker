import { renderSPTable } from '../components/tables.js';
import { renderSPChart } from '../components/charts.js';

export function renderSalesperson({ entries }) {
  renderSPTable(entries);
  renderSPChart(entries);
}
