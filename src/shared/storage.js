// Canonical storage keys and pattern key helpers for chrome.storage.local
// See docs/10_STORAGE_SCHEMA.md

export const STORAGE_KEYS = Object.freeze({
  STATS_GLOBAL: 'stats_global',
  STATS_BY_DOMAIN: 'stats_by_domain',
  STATS_LAST_RESET: 'stats_last_reset',
  ENABLED: 'enabled',
  WHITELIST: 'whitelist',
  FILTER_LAST_UPDATED: 'filter_last_updated',
  SETTINGS: 'settings',
});

/**
 * Returns the pattern storage key for daily stats: stats:day:YYYY-MM-DD
 * @param {string|Date} date - YYYY-MM-DD formatted string or Date instance
 * @returns {string}
 */
export function getDailyStatsKey(date) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `stats:day:${yyyy}-${mm}-${dd}`;
  }
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return `stats:day:${date}`;
  }
  throw new Error(
    'Invalid date format for daily stats key. Expected YYYY-MM-DD string or valid Date instance.'
  );
}

/**
 * Returns the pattern storage key for filter list cache: cache:lists:<listId>
 * @param {string} listId - Non-empty string identifier for the filter list
 * @returns {string}
 */
export function getListCacheKey(listId) {
  if (typeof listId !== 'string' || listId.trim().length === 0) {
    throw new Error('Invalid listId for list cache key. Expected non-empty string.');
  }
  return `cache:lists:${listId.trim()}`;
}
