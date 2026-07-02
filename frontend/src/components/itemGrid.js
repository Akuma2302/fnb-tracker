import { fmtRM, fmtNum } from '../utils/format.js';
import { aggBySKU } from '../utils/aggregate.js';

export function renderItemGrid(entries, skuDefs) {
  const el = document.getElementById('sku-cards');
  const skus = aggBySKU(entries, skuDefs);

  if (!skuDefs.length) {
    el.innerHTML = '<div class="placeholder">No SKUs configured.</div>';
    return;
  }

  el.innerHTML = skus.map((s) => {
    const margin = s.revenue > 0 ? ((s.grossProfit / s.revenue) * 100).toFixed(0) : 0;
    const receivedBadge = s.timesNotReceived > 0
      ? `<span class="badge badge-warn">${s.timesNotReceived} not received</span>`
      : `<span class="badge badge-up">Stocked</span>`;

    return `
      <div class="item-card">
        <div class="item-card-img">
          <img src="${s.image}" alt="${s.name}" loading="lazy"/>
        </div>
        <div class="item-card-body">
          <div class="item-card-name">${s.name}</div>
          <div class="item-card-price">RM${s.salePrice.toFixed(2)} · cost RM${s.costPrice.toFixed(2)}</div>
          <div class="item-card-stats">
            <div><span class="lbl">Sold</span><span class="val">${fmtNum(s.sold)}</span></div>
            <div><span class="lbl">Wasted</span><span class="val" style="color:var(--red)">${fmtNum(s.wasted)}</span></div>
          </div>
          <div class="item-card-stats">
            <div><span class="lbl">Revenue</span><span class="val">${fmtRM(s.revenue)}</span></div>
            <div><span class="lbl">Margin</span><span class="val" style="color:${margin >= 20 ? 'var(--green)' : 'var(--amber)'}">${margin}%</span></div>
          </div>
          <div class="item-card-footer">${receivedBadge}</div>
        </div>
      </div>`;
  }).join('');
}
