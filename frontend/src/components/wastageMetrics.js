import { fmtRM, fmtNum } from '../utils/format.js';

export function renderWastageMetrics(entries, targets) {
  const el = document.getElementById('wastage-metrics');
  if (!entries.length) {
    el.innerHTML = '<div class="placeholder" style="grid-column:1/-1">No data.</div>';
    return;
  }
  const wc = entries.reduce((a, e) => a + (e.totals?.wastageCost || 0), 0);
  const rev = entries.reduce((a, e) => a + (e.totals?.revenue || 0), 0);
  const wAmt = entries.reduce((a, e) => a + (e.totals?.totalWasted || 0), 0);
  const days = [...new Set(entries.map((e) => e.date))].length || 1;
  const over = wc > targets.wastageLimit * days;

  el.innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Total Wastage Cost</div>
      <div class="metric-val" style="color:var(--red)">${fmtRM(wc)}</div>
      <div class="metric-sub">${rev > 0 ? ((wc / rev) * 100).toFixed(1) : 0}% of revenue</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Units Wasted</div>
      <div class="metric-val">${fmtNum(wAmt)} pcs</div>
      <div class="metric-sub">Avg ${(wAmt / days).toFixed(1)} pcs/day</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Wastage vs Limit</div>
      <div class="metric-val" style="color:${over ? 'var(--red)' : 'var(--green)'}">
        ${over ? '⚠ Over' : '✓ Within'} <span class="badge ${over ? 'badge-down' : 'badge-up'}">${over ? 'Exceeded' : 'OK'}</span>
      </div>
      <div class="metric-sub">Limit: ${fmtRM(targets.wastageLimit)}/day</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg Wastage/Day</div>
      <div class="metric-val">${fmtRM(wc / days)}</div>
      <div class="metric-sub">Over ${days} day${days !== 1 ? 's' : ''}</div>
    </div>`;
}
