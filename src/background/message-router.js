// src/background/message-router.js
// Typed message router implementing all 16 canonical message types (docs/09_MESSAGING_CONTRACT.md).

import { logger } from '../shared/logger.js';
import { MSG, isKnownType } from '../shared/messages.js';
import { STORAGE_KEYS, dailyStatsKey, getWithDefaults } from '../shared/storage.js';
import { DEFAULT_SETTINGS, validateSettingsPatch } from '../shared/settings.js';
import { FILTER_LISTS } from '../shared/filter-lists.js';
import {
  getStatsSnapshot,
  resetInMemoryStats,
  initStats,
  flushStats,
  getTodayString,
  recordBlockEvent,
  syncMatchedRules,
} from './stats-tracker.js';
import { pauseDomain, resumeDomain, isPaused } from './rules-manager.js';
import { updateBadge } from './badge.js';
import { updateRules } from './rule-updater.js';

async function ensureStatsInitialized(sendResponse) {
  if (await initStats()) {
    return true;
  }
  sendResponse({
    ok: false,
    error: { code: 'INTERNAL', message: 'Statistics storage is unavailable' },
  });
  return false;
}

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
      (async () => {
        if (!(await ensureStatsInitialized(sendResponse))) {
          return;
        }
        const hostname =
          payload.hostname ||
          payload.domain ||
          (sender?.tab?.url ? new URL(sender.tab.url).hostname : '');
        const hasHostname = Boolean(hostname);
        if (!getStatsSnapshot().networkStatsAvailable) {
          const snapshot = getStatsSnapshot();
          sendResponse({
            ok: true,
            data: hasHostname
              ? { hostname, count: null, available: false, scope: 'site-aggregate' }
              : { lifetime: snapshot.lifetime, available: false, scope: 'global' },
          });
          return;
        }
        await syncMatchedRules();
        const snapshot = getStatsSnapshot();
        if (!hasHostname) {
          sendResponse({
            ok: true,
            data: {
              lifetime: snapshot.lifetime,
              available: snapshot.networkStatsAvailable,
              scope: 'global',
            },
          });
          return;
        }
        const available = snapshot.networkStatsAvailable;
        const count = available ? snapshot.byDomain[hostname.toLowerCase()] || 0 : null;
        sendResponse({ ok: true, data: { hostname, count, available, scope: 'site-aggregate' } });
      })().catch((error) => {
        sendResponse({ ok: false, error: { code: 'INTERNAL', message: error.message } });
      });
      return true;
    }

    case MSG.GET_TODAY_SUMMARY: {
      (async () => {
        if (!(await ensureStatsInitialized(sendResponse))) {
          return;
        }
        if (getStatsSnapshot().networkStatsAvailable) {
          await syncMatchedRules();
        }
        const snapshot = getStatsSnapshot();
        sendResponse({
          ok: true,
          data: {
            todayBlocked: snapshot.todayBlocked,
            totalBlocked: snapshot.totalBlocked,
            date: snapshot.todayDate,
            byType: { ...snapshot.today.byType },
            networkStatsAvailable: snapshot.networkStatsAvailable,
          },
        });
      })().catch((error) => {
        sendResponse({ ok: false, error: { code: 'INTERNAL', message: error.message } });
      });
      return true;
    }

    case MSG.GET_TOP_DOMAINS: {
      (async () => {
        if (!(await ensureStatsInitialized(sendResponse))) {
          return;
        }
        const n = typeof payload.n === 'number' && payload.n > 0 ? payload.n : 10;
        const snapshot = getStatsSnapshot();
        const sorted = Object.entries(snapshot.networkStatsAvailable ? snapshot.byDomain : {})
          .sort((a, b) => b[1] - a[1])
          .slice(0, n)
          .map(([domain, count]) => ({ domain, count }));
        sendResponse({
          ok: true,
          data: { topDomains: sorted, available: snapshot.networkStatsAvailable },
        });
      })().catch((error) => {
        sendResponse({ ok: false, error: { code: 'INTERNAL', message: error.message } });
      });
      return true;
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
      const count = payload.count;
      if (!Number.isSafeInteger(count) || count <= 0) {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'count must be a positive safe integer' },
        });
        return false;
      }
      const domain = payload.domain || payload.hostname || '';
      const reportTypes = ['cosmetic', 'youtube', 'youtubeDetected'];
      if (payload.type !== undefined && !reportTypes.includes(payload.type)) {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'type is not a supported cosmetic report' },
        });
        return false;
      }
      const blockType = reportTypes.includes(payload.type) ? payload.type : 'cosmetic';
      (async () => {
        try {
          if (!(await ensureStatsInitialized(sendResponse))) {
            return;
          }
          recordBlockEvent(domain, blockType, null, count);
          await flushStats();
          sendResponse({ ok: true });
        } catch (error) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: error.message } });
        }
      })();
      return true;
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
      if (!FILTER_LISTS.some((list) => list.id === listId)) {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'Unknown filter list' },
        });
        return false;
      }
      (async () => {
        try {
          const lists = await getWithDefaults(chrome.storage.local, STORAGE_KEYS.lists, {});
          const previous = lists[listId];
          lists[listId] = { ...(lists[listId] || {}), enabled };
          await chrome.storage.local.set({ [STORAGE_KEYS.lists]: lists });
          const update = await updateRules();
          if (!update.ok) {
            if (previous) {
              lists[listId] = previous;
            } else {
              delete lists[listId];
            }
            await chrome.storage.local.set({ [STORAGE_KEYS.lists]: lists });
            sendResponse({ ok: false, error: { code: 'INTERNAL', message: update.error } });
            return;
          }
          sendResponse({
            ok: true,
            data: {
              listId,
              enabled,
              ruleCount: update.count,
              failedSources: update.failedSources,
            },
          });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.LIST_UPDATE_NOW: {
      (async () => {
        try {
          const result = await updateRules();
          if (!result.ok) {
            sendResponse({ ok: false, error: { code: 'INTERNAL', message: result.error } });
            return;
          }
          sendResponse({
            ok: true,
            data: {
              updated: true,
              ruleCount: result.count,
              failedSources: result.failedSources,
            },
          });
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
          if (!(await ensureStatsInitialized(sendResponse))) {
            return;
          }
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
              byType: { network: 0, cosmetic: 0, youtube: 0, youtubeDetected: 0 },
            },
            [todayKey]: {
              date: today,
              total: 0,
              totalBlocked: 0,
              byType: { network: 0, cosmetic: 0, youtube: 0, youtubeDetected: 0 },
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
      const days = Number.isInteger(payload.days) && payload.days > 0 ? payload.days : null;
      const from = payload.from;
      const to = payload.to;
      if (!days && (!from || !to)) {
        sendResponse({
          ok: false,
          error: { code: 'BAD_PAYLOAD', message: 'from and to dates are required' },
        });
        return false;
      }
      (async () => {
        try {
          const end = to ? new Date(`${to}T00:00:00`) : new Date();
          const start = from
            ? new Date(`${from}T00:00:00`)
            : new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
          if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
            throw new TypeError('Invalid stats date range');
          }
          const keys = [];
          const dates = [];
          for (const date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            dates.push(dateString);
            keys.push(dailyStatsKey(dateString));
          }
          const rangeData = await chrome.storage.local.get(keys);
          const data = dates.map((date, index) => {
            const bucket = rangeData[keys[index]];
            const diagnosticsAvailable = bucket?.networkStatsAvailable === true;
            return {
              date,
              total: diagnosticsAvailable
                ? (bucket?.byType?.network ?? bucket?.total ?? bucket?.totalBlocked ?? 0)
                : null,
              byType:
                bucket?.byType ??
                (diagnosticsAvailable
                  ? { network: bucket?.total ?? bucket?.totalBlocked ?? 0 }
                  : null),
              networkStatsAvailable: diagnosticsAvailable,
            };
          });
          sendResponse({ ok: true, data });
        } catch (err) {
          sendResponse({ ok: false, error: { code: 'INTERNAL', message: err.message } });
        }
      })();
      return true;
    }

    case MSG.SETTINGS_GET: {
      (async () => {
        try {
          const [settings, lists] = await Promise.all([
            getWithDefaults(chrome.storage.local, STORAGE_KEYS.settings, DEFAULT_SETTINGS),
            getWithDefaults(chrome.storage.local, STORAGE_KEYS.lists, {}),
          ]);
          const configuredLists = Object.fromEntries(
            FILTER_LISTS.map((list) => [
              list.id,
              {
                name: list.name,
                enabled: lists[list.id]?.enabled !== false,
                license: list.license,
              },
            ])
          );
          sendResponse({ ok: true, data: { ...settings, lists: configuredLists } });
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
