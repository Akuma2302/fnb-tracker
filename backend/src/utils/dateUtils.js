const { env } = require('../config/env');

/**
 * Returns YYYY-MM-DD for "today minus offsetDays" in the configured timezone.
 */
function getLocalDate(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  return d.toLocaleDateString('en-CA', { timeZone: env.TIMEZONE });
}

function isValidDateString(str) {
  return /^\d{4}-\d{2}-\d{2}$/.test(str);
}

module.exports = { getLocalDate, isValidDateString };
