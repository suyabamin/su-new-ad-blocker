// src/background/stats-tracker.js
// Aggregates blocking statistics conforming to canonical storage schema (docs/10_STORAGE_SCHEMA.md).
// Debounces flushes to chrome.storage.local, enforces 50-entry topDomains cap, and samples DNR rule matches.

import { logger } from '../shared/logger.js';
import { STORAGE_KEYS, dailyStatsKey } from '../shared/storage.js';

const FLUSH_INTERVAL_MS = 1000;
export const MAX_TOP_DOMAINS = 50;

/**
 * Returns current date formatted as YYYY-MM-DD.
 * @returns {string}
 */
export function getTodayString() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

let inMemoryState = {
  today: {
    date: getTodayString(),
    total: 0,
    byType: { network: 0, cosmetic: 0, youtube: 0 },
    byList: {},
    topDomains: {},
  },
  lifetime: {
    total: 0,
    byType: { network: 0, cosmetic: 0, youtube: 0 },
  },
  // Backward compatibility alias for existing tests
  byDomain: {},
};

let flushTimeout = null;

/**
 * Resets all in-memory statistics.
 */
export function resetInMemoryStats() {
  inMemoryState = {
    today: {
      date: getTodayString(),
      total: 0,
      byType: { network: 0, cosmetic: 0, youtube: 0 },
      byList: {},
      topDomains: {},
    },
    lifetime: {
      total: 0,
      byType: { network: 0, cosmetic: 0, youtube: 0 },
    },
    byDomain: {},
  };
}

/**
 * Loads statistics from storage on startup.
 */
export async function initStats() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }

  try {
    const todayStr = getTodayString();
    const todayKey = dailyStatsKey(todayStr);

    const data = await chrome.storage.local.get([STORAGE_KEYS['stats:lifetime'], todayKey]);

    const storedLifetime = data[STORAGE_KEYS['stats:lifetime']] || {};
    const storedDay = data[todayKey] || {};

    inMemoryState.lifetime = {
      total: Number(storedLifetime.total) || Number(storedLifetime.totalBlocked) || 0,
      byType: {
        network: Number(storedLifetime.byType?.network) || 0,
        cosmetic: Number(storedLifetime.byType?.cosmetic) || 0,
        youtube: Number(storedLifetime.byType?.youtube) || 0,
      },
    };

    const dayTopDomains = storedDay.topDomains || storedDay.byDomain || {};
    inMemoryState.today = {
      date: todayStr,
      total: Number(storedDay.total) || Number(storedDay.totalBlocked) || 0,
      byType: {
        network: Number(storedDay.byType?.network) || 0,
        cosmetic: Number(storedDay.byType?.cosmetic) || 0,
        youtube: Number(storedDay.byType?.youtube) || 0,
      },
      byList: storedDay.byList || {},
      topDomains: { ...dayTopDomains },
    };

    inMemoryState.byDomain = { ...dayTopDomains };

    logger.info('StatsTracker', `Initialized with ${inMemoryState.lifetime.total} lifetime blocks`);
  } catch (err) {
    logger.error('StatsTracker', 'Failed to load stats from storage:', err);
  }
}

/**
 * Inserts or increments a domain in topDomains, capping the dictionary at MAX_TOP_DOMAINS (50).
 * Drops lowest count entries when the cap is exceeded.
 *
 * @param {Record<string, number>} topDomains
 * @param {string} domain
 * @param {number} [count=1]
 */
export function updateTopDomains(topDomains, domain, count = 1) {
  topDomains[domain] = (topDomains[domain] || 0) + count;
  const entries = Object.entries(topDomains);
  if (entries.length > MAX_TOP_DOMAINS) {
    // Sort ascending by count so lowest can be removed
    entries.sort((a, b) => a[1] - b[1]);
    const dropCount = entries.length - MAX_TOP_DOMAINS;
    for (let i = 0; i < dropCount; i++) {
      delete topDomains[entries[i][0]];
    }
  }
}

/**
 * Records a block event (network, cosmetic, or youtube).
 *
 * @param {string} domain - Hostname of blocked item
 * @param {'network' | 'cosmetic' | 'youtube'} [type='network']
 * @param {string} [listId]
 * @param {number} [count=1]
 */
export function recordBlockEvent(domain, type = 'network', listId = null, count = 1) {
  if (!domain || typeof domain !== 'string') {
    return;
  }

  const cleanDomain = domain.toLowerCase().trim();
  if (!cleanDomain) {
    return;
  }

  const todayStr = getTodayString();
  if (inMemoryState.today.date !== todayStr) {
    inMemoryState.today = {
      date: todayStr,
      total: 0,
      byType: { network: 0, cosmetic: 0, youtube: 0 },
      byList: {},
      topDomains: {},
    };
    inMemoryState.byDomain = {};
  }

  const validTypes = ['network', 'cosmetic', 'youtube'];
  const blockType = validTypes.includes(type) ? type : 'network';

  inMemoryState.today.total += count;
  inMemoryState.today.byType[blockType] = (inMemoryState.today.byType[blockType] || 0) + count;

  inMemoryState.lifetime.total += count;
  inMemoryState.lifetime.byType[blockType] =
    (inMemoryState.lifetime.byType[blockType] || 0) + count;

  if (listId && typeof listId === 'string') {
    inMemoryState.today.byList[listId] = (inMemoryState.today.byList[listId] || 0) + count;
  }

  updateTopDomains(inMemoryState.today.topDomains, cleanDomain, count);
  inMemoryState.byDomain[cleanDomain] = (inMemoryState.byDomain[cleanDomain] || 0) + count;

  scheduleFlush();
}

/**
 * Schedules debounced flush to storage.
 */
export function scheduleFlush() {
  if (flushTimeout !== null) {
    return;
  }

  flushTimeout = setTimeout(() => {
    flushTimeout = null;
    flushStats();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Immediately flushes in-memory statistics to chrome.storage.local.
 * @returns {Promise<void>}
 */
export async function flushStats() {
  if (flushTimeout !== null) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }

  try {
    const todayKey = dailyStatsKey(inMemoryState.today.date);

    await chrome.storage.local.set({
      [STORAGE_KEYS['stats:lifetime']]: {
        total: inMemoryState.lifetime.total,
        totalBlocked: inMemoryState.lifetime.total,
        byType: { ...inMemoryState.lifetime.byType },
      },
      [todayKey]: {
        date: inMemoryState.today.date,
        total: inMemoryState.today.total,
        totalBlocked: inMemoryState.today.total,
        byType: { ...inMemoryState.today.byType },
        byList: { ...inMemoryState.today.byList },
        topDomains: { ...inMemoryState.today.topDomains },
        byDomain: { ...inMemoryState.byDomain },
      },
    });

    logger.debug('StatsTracker', 'Flushed statistics to storage');
  } catch (err) {
    logger.error('StatsTracker', 'Failed to flush statistics:', err);
  }
}

/**
 * Returns current snapshot of statistics.
 */
export function getStatsSnapshot() {
  return {
    totalBlocked: inMemoryState.lifetime.total,
    todayBlocked: inMemoryState.today.total,
    todayDate: inMemoryState.today.date,
    today: { ...inMemoryState.today },
    lifetime: { ...inMemoryState.lifetime },
    byDomain: { ...inMemoryState.byDomain },
  };
}

/**
 * Sets up listener for declarativeNetRequest.onRuleMatchedDebug.
 */
export function setupDnrRuleMatchedListener() {
  if (
    typeof chrome === 'undefined' ||
    !chrome.declarativeNetRequest ||
    !chrome.declarativeNetRequest.onRuleMatchedDebug
  ) {
    return;
  }

  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    try {
      if (info?.request?.url) {
        const url = new URL(info.request.url);
        recordBlockEvent(url.hostname, 'network');
      }
    } catch {
      // Safe fallback if URL parsing fails
    }
  });
}
