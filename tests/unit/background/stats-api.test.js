import { describe, it, expect, beforeEach } from 'vitest';
import { createMockChrome } from '../../fixtures/chrome-mock.js';
import {
  handleMessage,
  resetStats,
  exportAllStats,
  getStatsRange,
} from '../../../src/background/stats-api.js';
import { recordBlockEvent, resetInMemoryStats } from '../../../src/background/stats.js';
import { MSG } from '../../../src/shared/messages.js';

describe('stats messaging API (src/background/stats-api.js)', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChrome();
    globalThis.chrome = mockChrome;
    resetInMemoryStats();
  });

  it('rejects non-object messages (AC-TE.2-2)', () => {
    let response;
    handleMessage(null, {}, (res) => {
      response = res;
    });
    expect(response).toEqual({ ok: false, error: 'message must be a plain object' });
  });

  it('rejects unknown message types (AC-TE.2-2)', () => {
    let response;
    handleMessage({ type: 'UNKNOWN_MESSAGE_TYPE' }, {}, (res) => {
      response = res;
    });
    expect(response).toEqual({ ok: false, error: 'unknown message type' });
  });

  it('handles GET_TAB_STATS message (AC-TE.2-1)', () => {
    recordBlockEvent('example.com');
    recordBlockEvent('example.com');

    let response;
    handleMessage({ type: MSG.GET_TAB_STATS, hostname: 'example.com' }, {}, (res) => {
      response = res;
    });
    expect(response).toEqual({
      ok: true,
      data: { hostname: 'example.com', count: 2 },
    });
  });

  it('handles GET_TODAY_SUMMARY message (AC-TE.2-1)', () => {
    recordBlockEvent('tracker.org');

    let response;
    handleMessage({ type: MSG.GET_TODAY_SUMMARY }, {}, (res) => {
      response = res;
    });
    expect(response.ok).toBe(true);
    expect(response.data.todayBlocked).toBe(1);
    expect(response.data.totalBlocked).toBe(1);
  });

  it('handles GET_TOP_DOMAINS message with sorting and limit (AC-TE.2-1)', () => {
    recordBlockEvent('b.com');
    recordBlockEvent('a.com');
    recordBlockEvent('a.com');
    recordBlockEvent('c.com');

    let response;
    handleMessage({ type: MSG.GET_TOP_DOMAINS, n: 2 }, {}, (res) => {
      response = res;
    });
    expect(response.ok).toBe(true);
    expect(response.data.topDomains).toHaveLength(2);
    expect(response.data.topDomains[0]).toEqual({ domain: 'a.com', count: 2 });
  });

  it('handles STATS_RESET message (AC-TE.2-3)', async () => {
    recordBlockEvent('to-be-reset.com');

    await new Promise((resolve) => {
      handleMessage({ type: MSG.STATS_RESET }, {}, (res) => {
        expect(res.ok).toBe(true);
        resolve();
      });
    });

    const meta = await mockChrome.storage.local.get('stats:meta');
    expect(meta['stats:meta'].lastReset).toBeDefined();
  });

  it('handles STATS_EXPORT message (AC-TE.2-1)', async () => {
    recordBlockEvent('exportable.com');

    await new Promise((resolve) => {
      handleMessage({ type: MSG.STATS_EXPORT }, {}, (res) => {
        expect(res.ok).toBe(true);
        expect(res.data).toBeDefined();
        resolve();
      });
    });
  });

  it('handles GET_STATS_RANGE message (AC-TE.2-1)', async () => {
    await new Promise((resolve) => {
      handleMessage(
        { type: MSG.GET_STATS_RANGE, from: '2026-11-01', to: '2026-11-12' },
        {},
        (res) => {
          expect(res.ok).toBe(true);
          resolve();
        }
      );
    });
  });

  it('handles edge cases safely in helper functions', async () => {
    // Missing dates in getStatsRange
    const emptyRange = await getStatsRange('', '');
    expect(emptyRange).toEqual({});

    // Without chrome.storage
    const saved = globalThis.chrome;
    globalThis.chrome = {};
    await resetStats();
    await exportAllStats();
    await getStatsRange('2026-11-01', '2026-11-02');
    globalThis.chrome = saved;
  });
});
