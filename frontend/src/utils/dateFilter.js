import { todayStr } from './format.js';

/**
 * Filters entries by salesperson + a period mode ('today' | 'yesterday' | '3days' | 'week' | 'all' | 'custom').
 */
export function filterEntries(allEntries, { spVal, filterMode, customFrom, customTo }) {
  let rows = allEntries;
  if (spVal && spVal !== 'all') rows = rows.filter((e) => e.salesperson === spVal);

  const today = todayStr();

  if (filterMode === 'custom') {
    return rows.filter((e) => {
      if (customFrom && e.date < customFrom) return false;
      if (customTo && e.date > customTo) return false;
      return true;
    });
  }

  if (filterMode === 'today') return rows.filter((e) => e.date === today);

  if (filterMode === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    return rows.filter((e) => e.date === y);
  }

  if (filterMode === '3days') {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const cutoff = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    return rows.filter((e) => e.date >= cutoff);
  }

  if (filterMode === 'week') {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    const cutoff = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
    return rows.filter((e) => e.date >= cutoff);
  }

  return rows; // 'all'
}
