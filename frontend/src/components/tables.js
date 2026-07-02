import { fmtRM, fmtNum, fmtFull } from '../utils/format.js';
import { aggBySP } from '../utils/aggregate.js';

export function renderLogTable(entries) {
  const el = document.getElementById('log-table');
  if (!entries.length) {
    el.innerHTML = '<div class="placeholder">No data for this period.</div>';
    return;
  }
  const rows = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));

  el.innerHTML = `
    <table>
      <thead><tr>
        <th>Date</th><th>Salesperson</th><th>Units Sold</th><th>Revenue</th>
        <th>Gross Profit</th><th>Wastage</th><th>Margin</th>
      </tr></thead>
      <tbody>${rows.map((e) => {
        const t = e.totals || {};
        return `
          <tr>
            <td>${fmtFull(e.date)}</td>
            <td>${e.salesperson}</td>
            <td>${fmtNum(t.totalSold)}</td>
            <td>${fmtRM(t.revenue)}</td>
            <td style="color:var(--green)">${fmtRM(t.grossProfit)}</td>
            <td style="color:var(--red)">${fmtRM(t.wastageCost)}</td>
            <td>${t.grossMarginPct || 0}%</td>
          </tr>`;
      }).join('')}</tbody>
    </table>`;
}

export function renderSPTable(entries) {
  const el = document.getElementById('sp-table');
  const sps = aggBySP(entries);
  if (!sps.length) {
    el.innerHTML = '<div class="placeholder">No data for this period.</div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead><tr>
        <th>#</th><th>Salesperson</th><th>Days</th><th>Units Sold</th>
        <th>Revenue</th><th>Gross Profit</th><th>Wastage</th><th>Avg Revenue/Day</th>
      </tr></thead>
      <tbody>${sps.map((sp, i) => `
        <tr>
          <td><strong>#${i + 1}</strong></td>
          <td><strong>${sp.name}</strong></td>
          <td>${sp.days}</td>
          <td>${fmtNum(sp.sold)} pcs</td>
          <td>${fmtRM(sp.revenue)}</td>
          <td style="color:var(--green)">${fmtRM(sp.grossProfit)}</td>
          <td style="color:var(--red)">${fmtRM(sp.wastageCost)}</td>
          <td>${fmtRM(sp.days > 0 ? sp.revenue / sp.days : 0)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

export function renderTargetTable(allEntries, targets) {
  const el = document.getElementById('target-table');
  const dates = [...new Set(allEntries.map((e) => e.date))].sort().reverse().slice(0, 30);
  if (!dates.length) {
    el.innerHTML = '<div class="placeholder">No data.</div>';
    return;
  }

  el.innerHTML = `
    <table>
      <thead><tr>
        <th>Date</th><th>Revenue</th><th>Revenue Target</th><th>Gap</th>
        <th>Units</th><th>Unit Target</th><th>Wastage</th><th>Wastage Limit</th>
      </tr></thead>
      <tbody>${dates.map((d) => {
        const dEntries = allEntries.filter((e) => e.date === d);
        const rev = dEntries.reduce((a, e) => a + (e.totals?.revenue || 0), 0);
        const sold = dEntries.reduce((a, e) => a + (e.totals?.totalSold || 0), 0);
        const wc = dEntries.reduce((a, e) => a + (e.totals?.wastageCost || 0), 0);
        const gap = rev - targets.revenue;
        const gc = gap >= 0 ? 'var(--green)' : 'var(--red)';
        const wOver = wc > targets.wastageLimit;
        return `
          <tr>
            <td>${fmtFull(d)}</td>
            <td>${fmtRM(rev)}</td>
            <td>${fmtRM(targets.revenue)}</td>
            <td style="color:${gc}">${gap >= 0 ? '+' : ''}${fmtRM(gap)}</td>
            <td>${fmtNum(sold)}</td>
            <td>${fmtNum(targets.units)}</td>
            <td style="color:${wOver ? 'var(--red)' : 'var(--text)'}">${fmtRM(wc)}</td>
            <td>${fmtRM(targets.wastageLimit)}</td>
          </tr>`;
      }).join('')}
      </tbody>
    </table>`;
}
