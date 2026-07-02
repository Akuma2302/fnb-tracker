import { fmtRM, fmtNum, initials } from '../utils/format.js';
import { aggBySP } from '../utils/aggregate.js';

const SP_COLORS = [
  { bg: '#EEEDFE', fg: '#534AB7' },
  { bg: '#E1F5EE', fg: '#1D9E75' },
  { bg: '#FAEEDA', fg: '#BA7517' },
  { bg: '#E8F2FC', fg: '#378ADD' },
  { bg: '#FDEAEA', fg: '#E24B4A' },
  { bg: '#F0F0F2', fg: '#52525B' },
];

export function renderSPLeaderboard(entries) {
  const el = document.getElementById('sp-leaderboard');
  const sps = aggBySP(entries);

  if (!sps.length) {
    el.innerHTML = '<div class="placeholder">No data for this period.</div>';
    return;
  }

  el.innerHTML = sps.slice(0, 6).map((sp, i) => {
    const c = SP_COLORS[i % SP_COLORS.length];
    return `
      <div class="sp-row">
        <span class="sp-rank">${i + 1}</span>
        <span class="sp-avatar" style="background:${c.bg};color:${c.fg}">${initials(sp.name)}</span>
        <span>
          <div class="sp-name">${sp.name}</div>
          <div class="sp-sub">${sp.days} day${sp.days !== 1 ? 's' : ''} logged</div>
        </span>
        <span class="sp-sold">${fmtNum(sp.sold)} pcs</span>
        <span class="sp-rev">${fmtRM(sp.revenue)}</span>
      </div>`;
  }).join('');
}
