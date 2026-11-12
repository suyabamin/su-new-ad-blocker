// Canonical storage key constants and pattern-key helpers for browser storage areas.
// All keys used anywhere in the extension MUST come from this module.
// See docs/10_STORAGE_SCHEMA.md

export const STORAGE_KEYS = Object.freeze({
  schemaVersion: 'schemaVersion',
  settings: 'settings',
  lists: 'lists',
  allowlist: 'allowlist',
  customRules: 'customRules',
  'stats:lifetime': 'stats:lifetime',
  'stats:meta': 'stats:meta',
  'stats:seenNetworkRequests': 'stats:seenNetworkRequests',
});

/**
 * Checks whether a date string is a genuine YYYY-MM-DD calendar date.
 * Rejects invalid strings, month > 12, or impossible days (e.g. 2024-02-30).
 *
 * @param {unknown} dateStr
 * @returns {boolean}
 */
export function isValidCalendarDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/**
 * Returns the daily-stats storage key for a given date string.
 * Pattern: stats:day:YYYY-MM-DD
 *
 * @param {string} date - Must match YYYY-MM-DD and be a real calendar date
 * @returns {string}
 * @throws {TypeError} If date is not a valid calendar YYYY-MM-DD string
 */
export function dailyStatsKey(date) {
  if (!isValidCalendarDate(date)) {
    throw new TypeError(
      `dailyStatsKey: expected a valid calendar YYYY-MM-DD string, got ${JSON.stringify(date)}`
    );
  }
  return `stats:day:${date}`;
}

/**
 * Returns the cache storage key for a named filter list.
 * Pattern: cache:lists:<listId>
 *
 * @param {string} listId - Non-empty string matching /^[a-z0-9_-]{1,64}$/
 * @returns {string}
 * @throws {TypeError} If listId is empty, not a string, or contains invalid characters
 */
export function listCacheKey(listId) {
  if (typeof listId !== 'string' || !/^[a-z0-9_-]{1,64}$/.test(listId)) {
    throw new TypeError(
      `listCacheKey: expected a valid [a-z0-9_-]{1,64} string, got ${JSON.stringify(listId)}`
    );
  }
  return `cache:lists:${listId}`;
}

/** Backwards-compatible alias for listCacheKey */
export const getListCacheKey = listCacheKey;

/**
 * Reads from a storage area (e.g. chrome.storage.local) via this wrapper only.
 * Returns defaultValue when missing or undefined.
 *
 * @param {object} area - Storage area with a .get(key) method
 * @param {string} key - Storage key to read
 * @param {unknown} defaultValue - Fallback value if key is not present
 * @returns {Promise<unknown>}
 */
export async function getWithDefaults(area, key, defaultValue) {
  if (!area || typeof area.get !== 'function') {
    return defaultValue;
  }
  try {
    const result = await area.get(key);
    if (result && Object.prototype.hasOwnProperty.call(result, key) && result[key] !== undefined) {
      return result[key];
    }
  } catch {
    return defaultValue;
  }
  return defaultValue;
}
