// src/background/stats-tracker.js
// Aggregates blocking statistics conforming to canonical storage schema (docs/10_STORAGE_SCHEMA.md).
// Debounces flushes to chrome.storage.local, enforces 50-entry topDomains cap, and samples DNR rule matches.

import { logger } from '../shared/logger.js';
import { STORAGE_KEYS, dailyStatsKey } from '../shared/storage.js';
import { listPaused } from './rules-manager.js';

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
const seenMatchedRules = new Map();

/**
 * Resets all in-memory statistics.
 */
export function resetInMemoryStats() {
  seenMatchedRules.clear();
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

/** Collects newly matched blocking rules and attributes them to their page tab. */
export async function syncMatchedRules() {
  const dnr = globalThis.chrome?.declarativeNetRequest;
  const tabs = globalThis.chrome?.tabs;
  if (!dnr?.getMatchedRules || !tabs?.get) {
    return {};
  }

  try {
    const result = await dnr.getMatchedRules();
    const matches = result?.rulesMatchedInfo || [];
    const now = Date.now();
    const deltas = {};
    const matchOccurrences = new Map();
    for (const match of matches) {
      const { tabId, rule } = match || {};
      if (!Number.isInteger(tabId) || tabId < 0 || !rule) {
        continue;
      }
      const signature = `${tabId}:${rule.ruleId}:${match.timeStamp}`;
      const occurrence = matchOccurrences.get(signature) || 0;
      matchOccurrences.set(signature, occurrence + 1);
      const key = `${signature}:${occurrence}`;
      if (seenMatchedRules.has(key)) {
        continue;
      }
      seenMatchedRules.set(key, now);
      const tab = await tabs.get(tabId);
      const hostname = tab?.url ? new URL(tab.url).hostname.toLowerCase() : '';
      const paused = listPaused().some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
      if (!hostname || paused) {
        continue;
      }
      recordBlockEvent(hostname, 'network');
      deltas[tabId] = (deltas[tabId] || 0) + 1;
    }
    for (const [key, seenAt] of seenMatchedRules) {
      if (now - seenAt > 5 * 60 * 1000) {
        seenMatchedRules.delete(key);
      }
    }
    return deltas;
  } catch (err) {
    logger.error('StatsTracker', 'Failed to collect matched DNR rules:', err);
    return {};
  }
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
    const hasLifetimeNetworkCount = Number.isFinite(storedLifetime.byType?.network);
    const hasDayNetworkCount = Number.isFinite(storedDay.byType?.network);

    inMemoryState.lifetime = {
      total: hasLifetimeNetworkCount
        ? Number(storedLifetime.byType.network)
        : Number(storedLifetime.total) || Number(storedLifetime.totalBlocked) || 0,
      byType: {
        network: Number(storedLifetime.byType?.network) || 0,
        cosmetic: Number(storedLifetime.byType?.cosmetic) || 0,
        youtube: Number(storedLifetime.byType?.youtube) || 0,
      },
    };

    const dayTopDomains = storedDay.topDomains || storedDay.byDomain || {};
    inMemoryState.today = {
      date: todayStr,
      total: hasDayNetworkCount
        ? Number(storedDay.byType.network)
        : Number(storedDay.total) || Number(storedDay.totalBlocked) || 0,
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

  inMemoryState.today.byType[blockType] = (inMemoryState.today.byType[blockType] || 0) + count;
  inMemoryState.lifetime.byType[blockType] =
    (inMemoryState.lifetime.byType[blockType] || 0) + count;

  if (blockType === 'network') {
    inMemoryState.today.total += count;
    inMemoryState.lifetime.total += count;
    updateTopDomains(inMemoryState.today.topDomains, cleanDomain, count);
    inMemoryState.byDomain[cleanDomain] = (inMemoryState.byDomain[cleanDomain] || 0) + count;
  }

  if (blockType === 'network' && listId && typeof listId === 'string') {
    inMemoryState.today.byList[listId] = (inMemoryState.today.byList[listId] || 0) + count;
  }

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
  // getMatchedRules is polled on stats reads; the debug event is not available in store builds.
}
