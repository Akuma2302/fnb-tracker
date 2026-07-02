import { fetchDashboardData } from './services/api.js';
import { filterEntries } from './utils/dateFilter.js';
import { setLastUpdated } from './layout/header.js';
import { renderOverview } from './pages/overview.js';
import { renderSkuDeepDive } from './pages/skuDeepDive.js';
import { renderSalesperson } from './pages/salesperson.js';
import { renderWastage } from './pages/wastage.js';
import { renderTargets } from './pages/targets.js';

// ── Global state ──
const state = {
  allEntries: [],
  skuDefs: [],
  targets: { revenue: 22400, units: 2240, wastageLimit: 3500 },
  filterMode: 'today',
  customFrom: null,
  customTo: null,
  skuSort: 'revenue',
  activeTab: 'overview',
};

// ── Data loading ──
async function loadData() {
  try {
    const { entries, skus, targets } = await fetchDashboardData();
    state.allEntries = entries || [];
    state.skuDefs = skus || [];
    state.targets = targets || state.targets;

    setLastUpdated(state.allEntries);
    render();
  } catch (err) {
    console.error('Failed to load dashboard data:', err);
    document.getElementById('last-updated').textContent = 'Failed to load data — retrying…';
  }
}

// ── Filtering + render dispatch ──
function getFiltered() {
  const spVal = 'all';
  return filterEntries(state.allEntries, {
    spVal,
    filterMode: state.filterMode,
    customFrom: state.customFrom,
    customTo: state.customTo,
  });
}

function render() {
  const entries = getFiltered();
  const ctx = {
    entries,
    allEntries: state.allEntries,
    skuDefs: state.skuDefs,
    targets: state.targets,
    skuSort: state.skuSort,
  };

  switch (state.activeTab) {
    case 'overview': renderOverview(ctx); break;
    case 'sku': renderSkuDeepDive(ctx); break;
    case 'salesperson': renderSalesperson(ctx); break;
    case 'wastage': renderWastage(ctx); break;
    case 'targets': renderTargets(ctx); break;
  }
}

// ── Tab switching ──
function switchTab(name, el) {
  state.activeTab = name;
  ['overview', 'sku', 'salesperson', 'wastage', 'targets'].forEach((t) => {
    document.getElementById('tab-' + t).style.display = t === name ? '' : 'none';
  });
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  el.classList.add('active');
  render();
}

// ── Period filter buttons ──
function setFilter(mode, btn) {
  state.filterMode = mode;
  state.customFrom = null;
  state.customTo = null;
  document.getElementById('dateFrom').value = '';
  document.getElementById('dateTo').value = '';
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function setCustom() {
  state.customFrom = document.getElementById('dateFrom').value;
  state.customTo = document.getElementById('dateTo').value;
  if (!state.customFrom && !state.customTo) return;
  state.filterMode = 'custom';
  document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
  render();
}

function setSkuSort(key, el) {
  state.skuSort = key;
  document.querySelectorAll('#sku-sort-chips .chip').forEach((c) => c.classList.remove('active'));
  el.classList.add('active');
  render();
}

// Expose handlers used by inline onclick/onchange attributes in index.html
window.switchTab = switchTab;
window.setFilter = setFilter;
window.setCustom = setCustom;
window.setSkuSort = setSkuSort;
window.loadData = loadData;
window.render = render;

// ── Init ──
loadData();
setInterval(loadData, 30_000);
