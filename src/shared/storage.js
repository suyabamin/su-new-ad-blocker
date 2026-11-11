// Canonical storage key constants and pattern-key helpers for chrome.storage.local.
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
});

/**
 * Returns the daily-stats storage key for a given date string.
 * Pattern: stats:day:YYYY-MM-DD
 *
 * @param {string} dateString - Must match /^\d{4}-\d{2}-\d{2}$/
 * @returns {string}
 * @throws {TypeError} If dateString is not a valid YYYY-MM-DD string
 */
export function dailyStatsKey(dateString) {
  if (typeof dateString !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new TypeError(
      `dailyStatsKey: expected a YYYY-MM-DD string, got ${JSON.stringify(dateString)}`
    );
  }
  return `stats:day:${dateString}`;
}

/**
 * Returns the cache storage key for a named filter list.
 * Pattern: cache:lists:<listId>
 *
 * @param {string} listId - Non-empty string matching /^[a-z0-9_-]+$/
 * @returns {string}
 * @throws {TypeError} If listId is empty, not a string, or contains invalid characters
 */
export function getListCacheKey(listId) {
  if (typeof listId !== 'string' || !/^[a-z0-9_-]+$/.test(listId)) {
    throw new TypeError(
      `getListCacheKey: expected a non-empty [a-z0-9_-] string, got ${JSON.stringify(listId)}`
    );
  }
  return `cache:lists:${listId}`;
}
