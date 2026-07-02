import { fmtRM, fmtNum } from '../utils/format.js';

export function renderMetricsGrid(entries, targets) {
  const el = document.getElementById('metrics-grid');
  if (!entries.length) {
    el.innerHTML = '<div class="placeholder" style="grid-column:1/-1">No data for this period.</div>';
    return;
  }

  const revenue = entries.reduce((a, e) => a + (e.totals?.revenue || 0), 0);
  const grossProfit = entries.reduce((a, e) => a + (e.totals?.grossProfit || 0), 0);
  const wastageCost = entries.reduce((a, e) => a + (e.totals?.wastageCost || 0), 0);
  const totalSold = entries.reduce((a, e) => a + (e.totals?.totalSold || 0), 0);
  const margin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(1) : 0;
  const wastagePct = revenue > 0 ? ((wastageCost / revenue) * 100).toFixed(1) : 0;
  const overWastage = wastageCost > targets.wastageLimit;

  el.innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Revenue</div>
      <div class="metric-val">${fmtRM(revenue)}</div>
      <div class="metric-sub">Target: ${fmtRM(targets.revenue)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Gross Profit</div>
      <div class="metric-val">${fmtRM(grossProfit)} <span class="badge badge-up">${margin}%</span></div>
      <div class="metric-sub">Margin over period</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Wastage Cost</div>
      <div class="metric-val" style="color:var(--red)">${fmtRM(wastageCost)} <span class="badge ${overWastage ? 'badge-down' : 'badge-up'}">${wastagePct}%</span></div>
      <div class="metric-sub">Limit: ${fmtRM(targets.wastageLimit)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Units Sold</div>
      <div class="metric-val">${fmtNum(totalSold)} pcs</div>
      <div class="metric-sub">Target: ${fmtNum(targets.units)} pcs</div>
    </div>`;
}
