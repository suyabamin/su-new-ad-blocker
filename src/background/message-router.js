// src/background/message-router.js
// Typed message router implementing all 16 canonical message types (docs/09_MESSAGING_CONTRACT.md).

import { logger } from '../shared/logger.js';
import { MSG, isKnownType } from '../shared/messages.js';
import { STORAGE_KEYS, dailyStatsKey, getWithDefaults } from '../shared/storage.js';
import { DEFAULT_SETTINGS, validateSettingsPatch } from '../shared/settings.js';
import {
  getStatsSnapshot,
  resetInMemoryStats,
  flushStats,
  getTodayString,
  recordBlockEvent,
  syncMatchedRules,
} from './stats-tracker.js';
import {
  pauseDomain,
  resumeDomain,
  isPaused,
  enableRuleset,
  disableRuleset,
} from './rules-manager.js';
import { updateBadge } from './badge.js';
import { updateRules } from './rule-updater.js';

/**
 * Normalizes message request envelope { type, payload, v: 1 } or flat { type, ...payload }.
 * @param {unknown} message
 * @returns {{ type: string, payload: Record<string, any> } | null}
 */
export function normalizeEnvelope(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }
  const type = message.type;
  if (!isKnownType(type)) {
    return null;
  }
  let payload = message.payload;
  if (payload === undefined || payload === null) {
    // Flat message format fallback
    const rest = { ...message };
    delete rest.type;
    delete rest.v;
    payload = rest;
  } else if (typeof payload !== 'object') {
    payload = {};
  }
  return { type, payload };
}

/**
 * Main message handler for chrome.runtime.onMessage.
 * Returns true if an asynchronous response will be sent via sendResponse.
 *
 * @param {object} message
 * @param {object} sender
 * @param {function} sendResponse
 * @returns {boolean}
 */
export function handleMessage(message, sender, sendResponse) {
  if (!message || typeof message !== 'object') {
    sendResponse({
      ok: false,
      error: { code: 'BAD_PAYLOAD', message: 'Message must be an object' },
    });
    return false;
  }

  if (!isKnownType(message.type)) {
    sendResponse({
      ok: false,
      error: { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${message.type}` },
    });
    return false;
  }

  const envelope = normalizeEnvelope(message);
  const { type, payload } = envelope;

  switch (type) {
    case MSG.GET_TAB_STATS: {
      const hostname =
        payload.hostname ||
        payload.domain ||
        (sender?.tab?.url ? new URL(sender.tab.url).hostname : '');
      if (
        !globalThis.chrome?.declarativeNetRequest?.getMatchedRules ||
        !globalThis.chrome?.tabs?.get
      ) {
        const snapshot = getStatsSnapshot();
        const count = snapshot.byDomain[hostname?.toLowerCase()] || 0;
        sendResponse({ ok: true, data: { hostname, count } });
        return false;
      }
      syncMatchedRules().then(() => {
        const snapshot = getStatsSnapshot();
        const count = snapshot.byDomain[hostname?.toLowerCase()] || 0;
        sendResponse({ ok: true, data: { hostname, count } });
      });
      return true;
    }

    case MSG.GET_TODAY_SUMMARY: {
      if (
        !globalThis.chrome?.declarativeNetRequest?.getMatchedRules ||
        !globalThis.chrome?.tabs?.get
      ) {
        const snapshot = getStatsSnapshot();
        sendResponse({
          ok: true,
          data: {
            todayBlocked: snapshot.todayBlocked,
            totalBlocked: snapshot.totalBlocked,
            date: snapshot.todayDate,
            byType: { ...snapshot.today.byType },
          },
        });
        return false;
      }
      syncMatchedRules().then(() => {
        const snapshot = getStatsSnapshot();
        sendResponse({
          ok: true,
          data: {
            todayBlocked: snapshot.todayBlocked,
            totalBlocked: snapshot.totalBlocked,
            date: snapshot.todayDate,
            byType: { ...snapshot.today.byType },
          },
        });
      });
      return true;
    }

    case MSG.GET_TOP_DOMAINS: {
      const n = typeof payload.n === 'number' && payload.n > 0 ? payload.n : 10;
      const snapshot = getStatsSnapshot();
      const sorted = Object.entries(snapshot.byDomain)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([domain, count]) => ({ domain, count }));
      sendResponse({ ok: true, data: { topDomains: sorted } });
      return false;
    }

    case MSG.TOGGLE_PAUSE_SITE: {
      const domain = payload.domain || payload.hostname;
      if (!domain || typeof domain !== 'string') {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'domain is required for TOGGLE_PAUSE_SITE' },
        });
        return false;
      }
      (async () => {
        try {
          const paused = isPaused(domain);
          if (paused) {
            await resumeDomain(domain);
          } else {
            await pauseDomain(domain);
          }
          sendResponse({
            ok: true,
            data: { domain, isPaused: !paused },
          });
        } catch (err) {
          sendResponse({
            ok: false,
            error: { code: 'INTERNAL', message: err.message },
          });
        }
      })();
      return true;
    }

    case MSG.GET_COSMETIC_RULES: {
      // Stub cosmetic rules list for content script
      sendResponse({
        ok: true,
        data: { rules: [], selectors: [] },
      });
      return false;
    }

    case MSG.CS_BLOCKED_REPORT: {
      const count = typeof payload.count === 'number' && payload.count > 0 ? payload.count : 1;
      const domain = payload.domain || payload.hostname || 'cosmetic';
      const blockType = payload.type === 'youtube' ? 'youtube' : 'cosmetic';
      recordBlockEvent(domain, blockType, null, count);
      sendResponse({ ok: true });
      return false;
    }

    case MSG.ALLOWLIST_ADD: {
      const domain = payload.domain;
      if (!domain || typeof domain !== 'string') {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'domain is required for ALLOWLIST_ADD' },
        });
        return false;
      }
      (async () => {
        try {
          const clean = domain.toLowerCase().trim();
          const allowlist = await getWithDefaults(chrome.storage.local, STORAGE_KEYS.allowlist, []);
          if (!allowlist.includes(clean)) {
            allowlist.push(clean);
            await chrome.storage.local.set({ [STORAGE_KEYS.allowlist]: allowlist });
          }
          await pauseDomain(clean);
          sendResponse({ ok: true, data: { allowlist } });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.ALLOWLIST_REMOVE: {
      const domain = payload.domain;
      if (!domain || typeof domain !== 'string') {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'domain is required for ALLOWLIST_REMOVE' },
        });
        return false;
      }
      (async () => {
        try {
          const clean = domain.toLowerCase().trim();
          let allowlist = await getWithDefaults(chrome.storage.local, STORAGE_KEYS.allowlist, []);
          allowlist = allowlist.filter((d) => d !== clean);
          await chrome.storage.local.set({ [STORAGE_KEYS.allowlist]: allowlist });
          await resumeDomain(clean);
          sendResponse({ ok: true, data: { allowlist } });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.LIST_TOGGLE: {
      const { listId, enabled } = payload;
      if (!listId || typeof enabled !== 'boolean') {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'listId and boolean enabled required' },
        });
        return false;
      }
      (async () => {
        try {
          const lists = await getWithDefaults(chrome.storage.local, STORAGE_KEYS.lists, {});
          lists[listId] = { ...(lists[listId] || {}), enabled };
          await chrome.storage.local.set({ [STORAGE_KEYS.lists]: lists });
          if (enabled) {
            await enableRuleset(listId).catch(() => {});
          } else {
            await disableRuleset(listId).catch(() => {});
          }
          sendResponse({ ok: true, data: { listId, enabled } });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.LIST_UPDATE_NOW: {
      (async () => {
        try {
          const count = await updateRules();
          sendResponse({ ok: true, data: { updated: true, ruleCount: count } });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.CUSTOM_RULES_SET: {
      const rules = payload.rules;
      if (!Array.isArray(rules)) {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'rules array is required' },
        });
        return false;
      }
      (async () => {
        try {
          await chrome.storage.local.set({ [STORAGE_KEYS.customRules]: rules });
          sendResponse({ ok: true, data: { count: rules.length } });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.STATS_EXPORT: {
      (async () => {
        try {
          await flushStats();
          const allData = await chrome.storage.local.get(null);
          sendResponse({ ok: true, data: allData });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.STATS_RESET: {
      if (payload.confirm !== true) {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'confirm: true is required to reset stats' },
        });
        return false;
      }
      (async () => {
        try {
          resetInMemoryStats();
          const today = getTodayString();
          const todayKey = dailyStatsKey(today);
          await chrome.storage.local.set({
            [STORAGE_KEYS['stats:lifetime']]: {
              total: 0,
              totalBlocked: 0,
              byType: { network: 0, cosmetic: 0, youtube: 0 },
            },
            [todayKey]: {
              date: today,
              total: 0,
              totalBlocked: 0,
              byType: { network: 0, cosmetic: 0, youtube: 0 },
              byList: {},
              topDomains: {},
              byDomain: {},
            },
            [STORAGE_KEYS['stats:meta']]: {
              lastReset: new Date().toISOString(),
            },
          });
          sendResponse({ ok: true });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.GET_STATS_RANGE: {
      const { from, to } = payload;
      if (!from || !to) {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'from and to dates are required' },
        });
        return false;
      }
      (async () => {
        try {
          const fromKey = dailyStatsKey(from);
          const toKey = dailyStatsKey(to);
          const rangeData = await chrome.storage.local.get([fromKey, toKey]);
          sendResponse({ ok: true, data: rangeData });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.SETTINGS_GET: {
      (async () => {
        try {
          const settings = await getWithDefaults(
            chrome.storage.local,
            STORAGE_KEYS.settings,
            DEFAULT_SETTINGS
          );
          sendResponse({ ok: true, data: settings });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.SETTINGS_SET: {
      const patch = payload.patch;
      if (!patch || typeof patch !== 'object') {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'patch object is required' },
        });
        return false;
      }
      const validation = validateSettingsPatch(patch);
      if (!validation.ok) {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: validation.errors.join('; ') },
        });
        return false;
      }
      (async () => {
        try {
          const current = await getWithDefaults(
            chrome.storage.local,
            STORAGE_KEYS.settings,
            DEFAULT_SETTINGS
          );
          const updated = { ...current, ...patch };
          await chrome.storage.local.set({ [STORAGE_KEYS.settings]: updated });
          if ('showBadge' in patch) {
            await updateBadge().catch(() => {});
          }
          sendResponse({ ok: true, data: updated });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    default:
      sendResponse({
        ok: false,
        error: { code: 'UNKNOWN_TYPE', message: `Unhandled message type: ${type}` },
      });
      return false;
  }
}

/**
 * Registers handleMessage with chrome.runtime.onMessage.
 */
export function setupMessageRouter() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(handleMessage);
    logger.info('MessageRouter', 'Message router registered with chrome.runtime.onMessage');
  }
}
