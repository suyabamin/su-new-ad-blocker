import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleMessage, normalizeEnvelope } from '../../../src/background/message-router.js';
import { MSG } from '../../../src/shared/messages.js';
import { STORAGE_KEYS, dailyStatsKey } from '../../../src/shared/storage.js';
import { resetRulesManagerState } from '../../../src/background/rules-manager.js';
import { resetInMemoryStats } from '../../../src/background/stats-tracker.js';

describe('message router (src/background/message-router.js)', () => {
  let storageState;

  beforeEach(() => {
    resetRulesManagerState();
    resetInMemoryStats();
    storageState = {};

    global.chrome = {
      storage: {
        local: {
          get: vi.fn(async (keys) => {
            if (keys === null) {
              return { ...storageState };
            }
            if (Array.isArray(keys)) {
              const res = {};
              for (const k of keys) {
                if (k in storageState) {
                  res[k] = storageState[k];
                }
              }
              return res;
            }
            if (typeof keys === 'string') {
              return { [keys]: storageState[keys] };
            }
            return {};
          }),
          set: vi.fn(async (items) => {
            Object.assign(storageState, items);
          }),
        },
      },
      declarativeNetRequest: {
        updateDynamicRules: vi.fn().mockResolvedValue(undefined),
        updateEnabledRulesets: vi.fn().mockResolvedValue(undefined),
      },
      action: {
        setBadgeText: vi.fn().mockResolvedValue(undefined),
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  describe('envelope validation', () => {
    it('rejects non-object messages with BAD_PAYLOAD', () => {
      let response;
      const asyncFlag = handleMessage('not-an-object', {}, (res) => {
        response = res;
      });

      expect(asyncFlag).toBe(false);
      expect(response).toEqual({
        ok: false,
        error: { code: 'BAD_PAYLOAD', message: 'Message must be an object' },
      });
    });

    it('rejects unknown message types with UNKNOWN_TYPE', () => {
      let response;
      const asyncFlag = handleMessage({ type: 'INVALID_TYPE' }, {}, (res) => {
        response = res;
      });

      expect(asyncFlag).toBe(false);
      expect(response.ok).toBe(false);
      expect(response.error.code).toBe('UNKNOWN_TYPE');
    });

    it('normalizes flat message into canonical payload', () => {
      const normalized = normalizeEnvelope({
        type: MSG.GET_TAB_STATS,
        hostname: 'example.com',
      });
      expect(normalized).toEqual({
        type: MSG.GET_TAB_STATS,
        payload: { hostname: 'example.com' },
      });
    });
  });

  describe('stats message types', () => {
    it('handles GET_TAB_STATS', () => {
      let response;
      handleMessage(
        { type: MSG.GET_TAB_STATS, payload: { hostname: 'example.com' } },
        {},
        (res) => {
          response = res;
        }
      );
      expect(response.ok).toBe(true);
      expect(response.data).toEqual({ hostname: 'example.com', count: 0 });
    });

    it('handles GET_TODAY_SUMMARY', () => {
      let response;
      handleMessage({ type: MSG.GET_TODAY_SUMMARY, payload: {} }, {}, (res) => {
        response = res;
      });
      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('todayBlocked', 0);
      expect(response.data).toHaveProperty('totalBlocked', 0);
      expect(response.data).toHaveProperty('date');
      expect(response.data).toHaveProperty('byType');
    });

    it('handles GET_TOP_DOMAINS', () => {
      let response;
      handleMessage({ type: MSG.GET_TOP_DOMAINS, payload: { n: 5 } }, {}, (res) => {
        response = res;
      });
      expect(response.ok).toBe(true);
      expect(Array.isArray(response.data.topDomains)).toBe(true);
    });

    it('handles CS_BLOCKED_REPORT', () => {
      let response;
      handleMessage(
        {
          type: MSG.CS_BLOCKED_REPORT,
          payload: { count: 3, domain: 'example.com', type: 'cosmetic' },
        },
        {},
        (res) => {
          response = res;
        }
      );
      expect(response.ok).toBe(true);
    });

    it('handles STATS_RESET (requires confirm: true)', async () => {
      let rejectResponse;
      handleMessage({ type: MSG.STATS_RESET, payload: {} }, {}, (res) => {
        rejectResponse = res;
      });
      expect(rejectResponse.ok).toBe(false);
      expect(rejectResponse.error.code).toBe('BAD_PAYLOAD');

      let successResponse;
      await new Promise((resolve) => {
        handleMessage({ type: MSG.STATS_RESET, payload: { confirm: true } }, {}, (res) => {
          successResponse = res;
          resolve();
        });
      });
      expect(successResponse.ok).toBe(true);
      expect(storageState[STORAGE_KEYS['stats:lifetime']]).toEqual({
        total: 0,
        totalBlocked: 0,
        byType: { network: 0, cosmetic: 0, youtube: 0 },
      });
    });

    it('handles STATS_EXPORT', async () => {
      let response;
      await new Promise((resolve) => {
        handleMessage({ type: MSG.STATS_EXPORT, payload: {} }, {}, (res) => {
          response = res;
          resolve();
        });
      });
      expect(response.ok).toBe(true);
      expect(response.data).toBeDefined();
    });

    it('handles GET_STATS_RANGE', async () => {
      const fromKey = dailyStatsKey('2026-11-01');
      const toKey = dailyStatsKey('2026-11-02');
      storageState[fromKey] = { total: 10 };
      storageState[toKey] = { total: 20 };

      let response;
      await new Promise((resolve) => {
        handleMessage(
          { type: MSG.GET_STATS_RANGE, payload: { from: '2026-11-01', to: '2026-11-02' } },
          {},
          (res) => {
            response = res;
            resolve();
          }
        );
      });
      expect(response.ok).toBe(true);
      expect(response.data[fromKey]).toEqual({ total: 10 });
      expect(response.data[toKey]).toEqual({ total: 20 });
    });
  });

  describe('site control and allowlist message types', () => {
    it('handles TOGGLE_PAUSE_SITE', async () => {
      let pauseResponse;
      await new Promise((resolve) => {
        handleMessage(
          { type: MSG.TOGGLE_PAUSE_SITE, payload: { domain: 'news.com' } },
          {},
          (res) => {
            pauseResponse = res;
            resolve();
          }
        );
      });
      expect(pauseResponse.ok).toBe(true);
      expect(pauseResponse.data).toEqual({ domain: 'news.com', isPaused: true });

      let resumeResponse;
      await new Promise((resolve) => {
        handleMessage(
          { type: MSG.TOGGLE_PAUSE_SITE, payload: { domain: 'news.com' } },
          {},
          (res) => {
            resumeResponse = res;
            resolve();
          }
        );
      });
      expect(resumeResponse.ok).toBe(true);
      expect(resumeResponse.data).toEqual({ domain: 'news.com', isPaused: false });
    });

    it('handles ALLOWLIST_ADD and ALLOWLIST_REMOVE', async () => {
      let addResponse;
      await new Promise((resolve) => {
        handleMessage(
          { type: MSG.ALLOWLIST_ADD, payload: { domain: 'trusted.org' } },
          {},
          (res) => {
            addResponse = res;
            resolve();
          }
        );
      });
      expect(addResponse.ok).toBe(true);
      expect(addResponse.data.allowlist).toContain('trusted.org');

      let removeResponse;
      await new Promise((resolve) => {
        handleMessage(
          { type: MSG.ALLOWLIST_REMOVE, payload: { domain: 'trusted.org' } },
          {},
          (res) => {
            removeResponse = res;
            resolve();
          }
        );
      });
      expect(removeResponse.ok).toBe(true);
      expect(removeResponse.data.allowlist).not.toContain('trusted.org');
    });
  });

  describe('rules and settings message types', () => {
    it('handles GET_COSMETIC_RULES', () => {
      let response;
      handleMessage(
        { type: MSG.GET_COSMETIC_RULES, payload: { hostname: 'example.com' } },
        {},
        (res) => {
          response = res;
        }
      );
      expect(response.ok).toBe(true);
      expect(response.data).toHaveProperty('rules');
      expect(response.data).toHaveProperty('selectors');
    });

    it('handles LIST_TOGGLE', async () => {
      let response;
      await new Promise((resolve) => {
        handleMessage(
          { type: MSG.LIST_TOGGLE, payload: { listId: 'easylist', enabled: false } },
          {},
          (res) => {
            response = res;
            resolve();
          }
        );
      });
      expect(response.ok).toBe(true);
      expect(response.data).toEqual({ listId: 'easylist', enabled: false });
    });

    it('handles CUSTOM_RULES_SET', async () => {
      const sampleRules = [{ id: 1, action: { type: 'block' }, condition: { urlFilter: 'bad' } }];
      let response;
      await new Promise((resolve) => {
        handleMessage(
          { type: MSG.CUSTOM_RULES_SET, payload: { rules: sampleRules } },
          {},
          (res) => {
            response = res;
            resolve();
          }
        );
      });
      expect(response.ok).toBe(true);
      expect(response.data.count).toBe(1);
      expect(storageState[STORAGE_KEYS.customRules]).toEqual(sampleRules);
    });

    it('handles SETTINGS_GET and SETTINGS_SET', async () => {
      let getResponse;
      await new Promise((resolve) => {
        handleMessage({ type: MSG.SETTINGS_GET, payload: {} }, {}, (res) => {
          getResponse = res;
          resolve();
        });
      });
      expect(getResponse.ok).toBe(true);
      expect(getResponse.data).toHaveProperty('blockingEnabled', true);

      let setResponse;
      await new Promise((resolve) => {
        handleMessage(
          { type: MSG.SETTINGS_SET, payload: { patch: { showBadge: false } } },
          {},
          (res) => {
            setResponse = res;
            resolve();
          }
        );
      });
      expect(setResponse.ok).toBe(true);
      expect(setResponse.data.showBadge).toBe(false);

      // Verify invalid patch rejection
      let invalidResponse;
      handleMessage({ type: MSG.SETTINGS_SET, payload: { patch: { locale: 'fr' } } }, {}, (res) => {
        invalidResponse = res;
      });
      expect(invalidResponse.ok).toBe(false);
      expect(invalidResponse.error.code).toBe('BAD_PAYLOAD');
    });
  });
});
