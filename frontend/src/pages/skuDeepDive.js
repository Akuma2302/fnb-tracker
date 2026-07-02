import { renderItemGrid } from '../components/itemGrid.js';
import { renderSKUTrendChart } from '../components/charts.js';

export function renderSkuDeepDive({ entries, skuDefs }) {
  renderItemGrid(entries, skuDefs);
  renderSKUTrendChart(entries, skuDefs);
}
