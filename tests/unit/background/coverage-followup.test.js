import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleMessage } from '../../../src/background/message-router.js';
import { MSG } from '../../../src/shared/messages.js';
import {
  recordBlockEvent,
  recordDnrMatchedRequest,
  resetInMemoryStats,
  setupDnrRuleMatchedListener,
} from '../../../src/background/stats-tracker.js';

describe('background coverage follow-up', () => {
  let state;
  let sessionValues;

  beforeEach(() => {
    state = {};
    sessionValues = {};
    resetInMemoryStats();
    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn(async (key) => (key === null ? { ...state } : { [key]: state[key] })),
          set: vi.fn(async (items) => Object.assign(state, items)),
        },
        session: {
          get: vi.fn(async (key) => ({ [key]: sessionValues[key] })),
          set: vi.fn(async (items) => Object.assign(sessionValues, items)),
        },
      },
      declarativeNetRequest: {
        getMatchedRules: vi.fn().mockResolvedValue({ rulesMatchedInfo: [] }),
        getDynamicRules: vi.fn().mockResolvedValue([]),
        updateDynamicRules: vi.fn().mockResolvedValue(undefined),
        onRuleMatchedDebug: { addListener: vi.fn() },
      },
      tabs: { get: vi.fn().mockResolvedValue({ url: 'https://example.com/page' }) },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const privacy = url.includes('easyprivacy');
        const name = privacy ? 'EasyPrivacy' : 'EasyList';
        const suffix = privacy ? 'privacy' : 'ads';
        return {
          ok: true,
          url,
          headers: { get: () => null },
          text: async () =>
            `[Adblock Plus 2.0]\n! Title: ${name}\n${Array.from(
              { length: 120 },
              (_, index) => `||host${index}.${suffix}.example^`
            ).join('\n')}`,
        };
      })
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('returns synchronized tab and daily summaries and sorts reported domains', async () => {
    const send = (message) => new Promise((resolve) => handleMessage(message, {}, resolve));
    setupDnrRuleMatchedListener();
    await recordDnrMatchedRequest({
      rule: { ruleId: 50007 },
      request: { requestId: 'coverage-request', initiator: 'https://example.com' },
    });

    const tabCall = handleMessage(
      { type: MSG.GET_TAB_STATS, payload: { hostname: 'example.com' } },
      {},
      vi.fn()
    );
    expect(tabCall).toBe(true);
    const tab = await send({ type: MSG.GET_TAB_STATS, payload: { hostname: 'example.com' } });
    expect(tab).toEqual({
      ok: true,
      data: { hostname: 'example.com', count: 1, available: true, scope: 'site-aggregate' },
    });

    const summary = await send({ type: MSG.GET_TODAY_SUMMARY, payload: {} });
    expect(summary.ok).toBe(true);
    expect(summary.data.todayBlocked).toBe(1);

    recordBlockEvent('one.example', 'network', null, 1);
    recordBlockEvent('two.example', 'network', null, 4);
    const top = await send({ type: MSG.GET_TOP_DOMAINS, payload: { n: 2 } });
    expect(top.data.topDomains.map(({ domain }) => domain)).toEqual(['two.example', 'example.com']);
  });

  it('runs the immediate list update handler', async () => {
    const response = await new Promise((resolve) =>
      handleMessage({ type: MSG.LIST_UPDATE_NOW, payload: {} }, {}, resolve)
    );
    expect(response.ok).toBe(true);
    expect(response.data.updated).toBe(true);
  });
});
