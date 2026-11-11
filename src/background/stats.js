// Statistics Tracker: block event counter and periodic debounced flush to chrome.storage.local
// See docs/15_TASK_PLAN.md TE.1

import { logger } from '../shared/logger.js';
import { STORAGE_KEYS, dailyStatsKey } from '../shared/storage.js';

let inMemoryStats = {
  totalBlocked: 0,
  byDomain: {},
  todayBlocked: 0,
  todayDate: getTodayString(),
};

let flushTimeout = null;
const FLUSH_DEBOUNCE_MS = 1000; // at most once per second per AC-TE.1-2

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

/**
 * Initializes statistics from chrome.storage.local on startup.
 */
export async function initStats() {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return;
  }

  try {
    const today = getTodayString();
    const todayKey = dailyStatsKey(today);

    const data = await chrome.storage.local.get([STORAGE_KEYS['stats:lifetime'], todayKey]);

    const lifetime = data[STORAGE_KEYS['stats:lifetime']] || { totalBlocked: 0 };
    const dayData = data[todayKey] || { totalBlocked: 0, byDomain: {} };

    inMemoryStats = {
      totalBlocked: Number(lifetime.totalBlocked) || 0,
      byDomain: dayData.byDomain || {},
      todayBlocked: Number(dayData.totalBlocked) || 0,
      todayDate: today,
    };

    logger.info('StatsTracker', `Initialized with ${inMemoryStats.totalBlocked} lifetime blocks`);
  } catch (err) {
    logger.error('StatsTracker', 'Failed to load stats from storage:', err);
  }
}

/**
 * Records a blocked request event for a given URL or hostname.
 * Debounces storage writes to at most once per second.
 *
 * @param {string} domain - Hostname of blocked request
 */
export function recordBlockEvent(domain) {
  if (!domain || typeof domain !== 'string') {
    return;
  }

  const cleanDomain = domain.toLowerCase().trim();
  const today = getTodayString();

  if (inMemoryStats.todayDate !== today) {
    inMemoryStats.todayDate = today;
    inMemoryStats.todayBlocked = 0;
    inMemoryStats.byDomain = {};
  }

  inMemoryStats.totalBlocked++;
  inMemoryStats.todayBlocked++;
  inMemoryStats.byDomain[cleanDomain] = (inMemoryStats.byDomain[cleanDomain] || 0) + 1;

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
  }, FLUSH_DEBOUNCE_MS);
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
    const todayKey = dailyStatsKey(inMemoryStats.todayDate);

    await chrome.storage.local.set({
      [STORAGE_KEYS['stats:lifetime']]: {
        totalBlocked: inMemoryStats.totalBlocked,
      },
      [todayKey]: {
        totalBlocked: inMemoryStats.todayBlocked,
        byDomain: inMemoryStats.byDomain,
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
  return { ...inMemoryStats };
}

/**
 * Resets in-memory stats.
 */
export function resetInMemoryStats() {
  inMemoryStats = {
    totalBlocked: 0,
    byDomain: {},
    todayBlocked: 0,
    todayDate: getTodayString(),
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
        recordBlockEvent(url.hostname);
      }
    } catch {
      // safe fallback if URL parsing fails
    }
  });
}
