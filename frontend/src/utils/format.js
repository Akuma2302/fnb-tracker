// ── Number / currency formatting (adds thousand separators, e.g. 14241 -> 14,241) ──
export const fmtRM = (v) =>
  `RM ${Number(v || 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const fmtNum = (v) => Number(v || 0).toLocaleString('en-MY');

// ── Date formatting ──
export const fmtShort = (s) =>
  new Date(s + 'T00:00:00').toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });

export const fmtFull = (s) =>
  new Date(s + 'T00:00:00').toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });

export const todayStr = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });

export const initials = (n) =>
  n ? n.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) : '?';
