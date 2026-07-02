import { fmtRM, fmtNum } from '../utils/format.js';

function pct(actual, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((actual / target) * 100));
}

export function renderDailyTargets(entries, targets) {
  const el = document.getElementById('daily-targets');

  const revenue = entries.reduce((a, e) => a + (e.totals?.revenue || 0), 0);
  const sold = entries.reduce((a, e) => a + (e.totals?.totalSold || 0), 0);
  const wastage = entries.reduce((a, e) => a + (e.totals?.wastageCost || 0), 0);

  const wastageOver = wastage > targets.wastageLimit;

  el.innerHTML = `
    <div class="prog-row">
      <div class="prog-label"><span class="lbl">Revenue</span><span class="val">${fmtRM(revenue)} / ${fmtRM(targets.revenue)}</span></div>
      <div class="prog-bar"><div class="prog-fill" style="width:${pct(revenue, targets.revenue)}%;background:var(--indigo)"></div></div>
    </div>
    <div class="prog-row">
      <div class="prog-label"><span class="lbl">Units Sold</span><span class="val">${fmtNum(sold)} / ${fmtNum(targets.units)} pcs</span></div>
      <div class="prog-bar"><div class="prog-fill" style="width:${pct(sold, targets.units)}%;background:var(--green)"></div></div>
    </div>
    <div class="prog-row">
      <div class="prog-label"><span class="lbl">Wastage Limit</span><span class="val" style="color:${wastageOver ? 'var(--red)' : 'var(--text)'}">${fmtRM(wastage)} / ${fmtRM(targets.wastageLimit)}</span></div>
      <div class="prog-bar"><div class="prog-fill" style="width:${pct(wastage, targets.wastageLimit)}%;background:var(--red)"></div></div>
    </div>`;
}
