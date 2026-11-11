// Statistics Messaging API: handles stats queries, reset, and exports
// See docs/15_TASK_PLAN.md TE.2 and docs/09_MESSAGING_CONTRACT.md

import { MSG, isKnownType } from '../shared/messages.js';
import { STORAGE_KEYS, dailyStatsKey } from '../shared/storage.js';
import { getStatsSnapshot, resetInMemoryStats, flushStats, getTodayString } from './stats.js';

/**
 * Main message router function for runtime.onMessage
 *
 * @param {object} message
 * @param {object} sender
 * @param {function} sendResponse
 * @returns {boolean|undefined} Returns true if response is async
 */
export function handleMessage(message, sender, sendResponse) {
  if (!message || typeof message !== 'object') {
    sendResponse({ ok: false, error: 'message must be a plain object' });
    return false;
  }

  if (!isKnownType(message.type)) {
    sendResponse({ ok: false, error: 'unknown message type' });
    return false;
  }

  switch (message.type) {
    case MSG.GET_TAB_STATS: {
      const hostname =
        message.hostname || (sender?.tab?.url ? new URL(sender.tab.url).hostname : '');
      const snapshot = getStatsSnapshot();
      const count = snapshot.byDomain[hostname?.toLowerCase()] || 0;
      sendResponse({ ok: true, data: { hostname, count } });
      return false;
    }

    case MSG.GET_TODAY_SUMMARY: {
      const snapshot = getStatsSnapshot();
      sendResponse({
        ok: true,
        data: {
          todayBlocked: snapshot.todayBlocked,
          totalBlocked: snapshot.totalBlocked,
          date: snapshot.todayDate,
        },
      });
      return false;
    }

    case MSG.GET_TOP_DOMAINS: {
      const n = typeof message.n === 'number' && message.n > 0 ? message.n : 10;
      const snapshot = getStatsSnapshot();
      const sorted = Object.entries(snapshot.byDomain)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([domain, count]) => ({ domain, count }));
      sendResponse({ ok: true, data: { topDomains: sorted } });
      return false;
    }

    case MSG.STATS_RESET: {
      resetStats()
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MSG.STATS_EXPORT: {
      exportAllStats()
        .then((data) => sendResponse({ ok: true, data }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case MSG.GET_STATS_RANGE: {
      getStatsRange(message.from, message.to)
        .then((rangeData) => sendResponse({ ok: true, data: rangeData }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    default:
      sendResponse({ ok: false, error: `handler not yet implemented for ${message.type}` });
      return false;
  }
}

/**
 * Resets all stats in memory and in chrome.storage.local.
 * @returns {Promise<void>}
 */
export async function resetStats() {
  resetInMemoryStats();

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const today = getTodayString();
    const todayKey = dailyStatsKey(today);

    await chrome.storage.local.set({
      [STORAGE_KEYS['stats:lifetime']]: { totalBlocked: 0 },
      [todayKey]: { totalBlocked: 0, byDomain: {} },
      [STORAGE_KEYS['stats:meta']]: {
        lastReset: new Date().toISOString(),
      },
    });
  }
}

/**
 * Exports all stats data as an object.
 * @returns {Promise<object>}
 */
export async function exportAllStats() {
  await flushStats();
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const all = await chrome.storage.local.get(null);
    return all;
  }
  return getStatsSnapshot();
}

/**
 * Reads stats for a range of dates.
 * @param {string} from
 * @param {string} to
 * @returns {Promise<object>}
 */
export async function getStatsRange(from, to) {
  if (!from || !to) {
    return {};
  }
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    // In local storage, query the keys in range
    const fromKey = dailyStatsKey(from);
    const toKey = dailyStatsKey(to);
    const data = await chrome.storage.local.get([fromKey, toKey]);
    return data;
  }
  return {};
}

/**
 * Registers handleMessage with chrome.runtime.onMessage.
 */
export function setupMessageRouter() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(handleMessage);
  }
}
