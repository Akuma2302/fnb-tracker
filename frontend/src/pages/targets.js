import { renderTargetTable } from '../components/tables.js';
import { renderTargetChart } from '../components/charts.js';

export function renderTargets({ allEntries, targets }) {
  renderTargetTable(allEntries, targets);
  renderTargetChart(allEntries, targets);
}
