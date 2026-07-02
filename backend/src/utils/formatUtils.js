/**
 * Formats a number as Malaysian Ringgit with thousand separators, e.g. 14241 -> "RM 14,241.00"
 */
function formatRM(val) {
  const num = Number(val) || 0;
  return `RM ${num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Formats a plain integer/decimal with thousand separators, e.g. 2240 -> "2,240"
 */
function formatNumber(val, decimals = 0) {
  const num = Number(val) || 0;
  return num.toLocaleString('en-MY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

module.exports = { formatRM, formatNumber };
