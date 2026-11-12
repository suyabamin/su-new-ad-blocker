// src/background/stats-tracker.js
// Aggregates blocking statistics conforming to canonical storage schema (docs/10_STORAGE_SCHEMA.md).
// Debounces flushes to chrome.storage.local, enforces 50-entry topDomains cap, and samples DNR rule matches.

import { logger } from '../shared/logger.js';
import { STORAGE_KEYS, dailyStatsKey } from '../shared/storage.js';
import {
  DYNAMIC_RULE_ID_OFFSET,
  DYNAMIC_RULES_PER_LIST,
  FILTER_LISTS,
  MAX_DYNAMIC_FILTER_RULES,
  MAX_STATIC_RULES,
} from '../shared/filter-lists.js';

const FLUSH_INTERVAL_MS = 1000;
export const MAX_TOP_DOMAINS = 50;
const MAX_SEEN_NETWORK_REQUESTS = 2000;

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
    byType: { network: 0, cosmetic: 0, youtube: 0, youtubeDetected: 0 },
    byList: {},
    topDomains: {},
  },
  lifetime: {
    total: 0,
    byType: { network: 0, cosmetic: 0, youtube: 0, youtubeDetected: 0 },
  },
  // Backward compatibility alias for existing tests
  byDomain: {},
};

let flushTimeout = null;
let processedRequestIds = new Set();
let networkStatsAvailable = false;
let registeredDebugEvent = null;
let statsInitialized = false;
let statsInitialization = null;

/**
 * Resets all in-memory statistics.
 */
export function resetInMemoryStats() {
  processedRequestIds = new Set();
  networkStatsAvailable = false;
  statsInitialized = false;
  statsInitialization = null;
  inMemoryState = {
    today: {
      date: getTodayString(),
      total: 0,
      byType: { network: 0, cosmetic: 0, youtube: 0, youtubeDetected: 0 },
      byList: {},
      topDomains: {},
    },
    lifetime: {
      total: 0,
      byType: { network: 0, cosmetic: 0, youtube: 0, youtubeDetected: 0 },
    },
    byDomain: {},
  };
}

function blockingRuleList(ruleId) {
  if (ruleId >= 1 && ruleId <= MAX_STATIC_RULES) {
    return { isBlock: true, listId: null };
  }
  const relativeId = ruleId - DYNAMIC_RULE_ID_OFFSET;
  if (relativeId < 0 || relativeId >= MAX_DYNAMIC_FILTER_RULES) {
    return { isBlock: false, listId: null };
  }
  const listIndex = Math.floor(relativeId / DYNAMIC_RULES_PER_LIST);
  return { isBlock: true, listId: FILTER_LISTS[listIndex]?.id || null };
}

function requestHostname(rawUrl) {
  if (typeof rawUrl !== 'string') {
    return '';
  }
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return '';
  }
}

async function rememberRequestId(requestId) {
  if (processedRequestIds.has(requestId)) {
    return false;
  }
  processedRequestIds.add(requestId);
  while (processedRequestIds.size > MAX_SEEN_NETWORK_REQUESTS) {
    processedRequestIds.delete(processedRequestIds.values().next().value);
  }
  const session = globalThis.chrome?.storage?.session;
  if (!session?.set) {
    processedRequestIds.delete(requestId);
    return false;
  }
  try {
    await session.set({
      [STORAGE_KEYS['stats:seenNetworkRequests']]: [...processedRequestIds],
    });
  } catch (error) {
    processedRequestIds.delete(requestId);
    logger.error('StatsTracker', 'Session deduplication persistence failed:', error);
    return false;
  }
  return true;
}

/** Records a real DNR match event. This event is available for unpacked builds only. */
export async function recordDnrMatchedRequest(info) {
  const ruleId = info?.rule?.ruleId;
  const requestId = info?.request?.requestId;
  const attribution = Number.isInteger(ruleId) ? blockingRuleList(ruleId) : null;
  if (!attribution?.isBlock || typeof requestId !== 'string' || !requestId) {
    return false;
  }

  await initStats();
  if (!statsInitialized) {
    return false;
  }
  if (!(await rememberRequestId(requestId))) {
    return false;
  }

  const hostname = requestHostname(info.request.initiator || info.request.documentUrl);
  networkStatsAvailable = true;
  recordBlockEvent(hostname, 'network', attribution.listId, 1, true);
  await flushStats();
  return true;
}

/** Kept for callers from older builds; polling is intentionally not used for accounting. */
export async function syncMatchedRules() {
  return {};
}

/**
 * Loads statistics from storage on startup.
 */
export async function initStats() {
  if (statsInitialized) {
    return true;
  }
  if (statsInitialization) {
    await statsInitialization;
    return statsInitialized;
  }
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return false;
  }

  statsInitialization = (async () => {
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
          youtubeDetected: Number(storedLifetime.byType?.youtubeDetected) || 0,
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
          youtubeDetected: Number(storedDay.byType?.youtubeDetected) || 0,
        },
        byList: storedDay.byList || {},
        topDomains: { ...dayTopDomains },
      };

      inMemoryState.byDomain = { ...dayTopDomains };

      const session = globalThis.chrome?.storage?.session;
      if (!session?.get || !session?.set) {
        throw new Error('Session storage is required for reliable DNR event deduplication');
      }
      const seen = await session.get(STORAGE_KEYS['stats:seenNetworkRequests']);
      const storedRequestIds = seen[STORAGE_KEYS['stats:seenNetworkRequests']];
      processedRequestIds = new Set(Array.isArray(storedRequestIds) ? storedRequestIds : []);

      statsInitialized = true;
      logger.info(
        'StatsTracker',
        `Initialized with ${inMemoryState.lifetime.total} lifetime blocks`
      );
    } catch (err) {
      logger.error('StatsTracker', 'Failed to load stats from storage:', err);
    }
  })().finally(() => {
    statsInitialization = null;
  });
  await statsInitialization;
  return statsInitialized;
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
 * @param {boolean} [allowUnattributed=false]
 */
export function recordBlockEvent(
  domain,
  type = 'network',
  listId = null,
  count = 1,
  allowUnattributed = false
) {
  if (!Number.isSafeInteger(count) || count <= 0) {
    return;
  }

  const cleanDomain = typeof domain === 'string' ? domain.toLowerCase().trim() : '';
  if (type === 'network' && !cleanDomain && !allowUnattributed) {
    return;
  }

  const todayStr = getTodayString();
  if (inMemoryState.today.date !== todayStr) {
    inMemoryState.today = {
      date: todayStr,
      total: 0,
      byType: { network: 0, cosmetic: 0, youtube: 0, youtubeDetected: 0 },
      byList: {},
      topDomains: {},
    };
    inMemoryState.byDomain = {};
  }

  const validTypes = ['network', 'cosmetic', 'youtube', 'youtubeDetected'];
  const blockType = validTypes.includes(type) ? type : 'network';

  inMemoryState.today.byType[blockType] = (inMemoryState.today.byType[blockType] || 0) + count;
  inMemoryState.lifetime.byType[blockType] =
    (inMemoryState.lifetime.byType[blockType] || 0) + count;

  if (blockType === 'network') {
    inMemoryState.today.total += count;
    inMemoryState.lifetime.total += count;
    if (cleanDomain) {
      updateTopDomains(inMemoryState.today.topDomains, cleanDomain, count);
      inMemoryState.byDomain[cleanDomain] = (inMemoryState.byDomain[cleanDomain] || 0) + count;
    }
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
    flushStats().catch((error) => {
      logger.error('StatsTracker', 'Scheduled statistics flush failed:', error);
    });
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
        networkStatsAvailable,
      },
    });

    logger.debug('StatsTracker', 'Flushed statistics to storage');
  } catch (err) {
    logger.error('StatsTracker', 'Failed to flush statistics:', err);
    throw err;
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
    networkStatsAvailable,
  };
}

/**
 * Sets up listener for declarativeNetRequest.onRuleMatchedDebug.
 */
export function setupDnrRuleMatchedListener() {
  const event = globalThis.chrome?.declarativeNetRequest?.onRuleMatchedDebug;
  if (!event?.addListener) {
    networkStatsAvailable = false;
    return false;
  }
  if (registeredDebugEvent === event) {
    return true;
  }
  try {
    event.addListener((info) => {
      recordDnrMatchedRequest(info).catch((error) => {
        logger.error('StatsTracker', 'Failed to persist DNR match event:', error);
      });
    });
    registeredDebugEvent = event;
    return true;
  } catch (error) {
    networkStatsAvailable = false;
    logger.info('StatsTracker', 'DNR match diagnostics are unavailable:', error);
    return false;
  }
}
