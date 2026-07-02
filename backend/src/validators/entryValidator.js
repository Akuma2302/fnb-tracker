const { isValidDateString } = require('../utils/dateUtils');

/**
 * Parses "sold,wasted" text input, e.g. "25,3".
 * Returns { valid, sold, wasted }.
 */
function parseSoldWasted(text) {
  const parts = String(text).split(',').map((s) => parseInt(s.trim(), 10));
  if (parts.length !== 2 || parts.some(Number.isNaN) || parts.some((v) => v < 0)) {
    return { valid: false };
  }
  const [sold, wasted] = parts;
  return { valid: true, sold, wasted };
}

function validateDate(text) {
  return isValidDateString(text);
}

module.exports = { parseSoldWasted, validateDate };
