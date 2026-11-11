import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockChrome } from '../../fixtures/chrome-mock.js';
import {
  initStats,
  recordBlockEvent,
  flushStats,
  getStatsSnapshot,
  resetInMemoryStats,
  getTodayString,
  setupDnrRuleMatchedListener,
} from '../../../src/background/stats.js';

describe('stats tracker (src/background/stats.js)', () => {
  let mockChrome;

  beforeEach(() => {
    vi.useFakeTimers();
    mockChrome = createMockChrome();
    globalThis.chrome = mockChrome;
    resetInMemoryStats();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('records block events in memory (AC-TE.1-1)', () => {
    recordBlockEvent('doubleclick.net');
    recordBlockEvent('doubleclick.net');
    recordBlockEvent('googlesyndication.com');

    const snapshot = getStatsSnapshot();
    expect(snapshot.totalBlocked).toBe(3);
    expect(snapshot.todayBlocked).toBe(3);
    expect(snapshot.byDomain['doubleclick.net']).toBe(2);
    expect(snapshot.byDomain['googlesyndication.com']).toBe(1);
  });

  it('debounces flush to storage by at most once per second (AC-TE.1-2)', async () => {
    const setSpy = vi.spyOn(mockChrome.storage.local, 'set');

    recordBlockEvent('doubleclick.net');
    recordBlockEvent('doubleclick.net');

    expect(setSpy).not.toHaveBeenCalled();

    // Advance time by 500ms - still no flush
    vi.advanceTimersByTime(500);
    expect(setSpy).not.toHaveBeenCalled();

    // Advance past 1000ms - flush occurs
    vi.advanceTimersByTime(600);
    expect(setSpy).toHaveBeenCalledTimes(1);

    const snapshot = getStatsSnapshot();
    expect(snapshot.totalBlocked).toBe(2);
  });

  it('initializes from storage cleanly on startup (AC-TE.1-3)', async () => {
    const today = getTodayString();
    await mockChrome.storage.local.set({
      'stats:lifetime': { totalBlocked: 42 },
      [`stats:day:${today}`]: {
        totalBlocked: 10,
        byDomain: { 'ad.tracker.com': 10 },
      },
    });

    await initStats();

    const snapshot = getStatsSnapshot();
    expect(snapshot.totalBlocked).toBe(42);
    expect(snapshot.todayBlocked).toBe(10);
    expect(snapshot.byDomain['ad.tracker.com']).toBe(10);
  });

  it('setupDnrRuleMatchedListener records event from valid URL', () => {
    let callback;
    mockChrome.declarativeNetRequest.onRuleMatchedDebug = {
      addListener: (cb) => {
        callback = cb;
      },
    };

    setupDnrRuleMatchedListener();
    expect(callback).toBeDefined();

    callback({ request: { url: 'https://adservice.google.com/ads?id=123' } });

    const snapshot = getStatsSnapshot();
    expect(snapshot.totalBlocked).toBe(1);
    expect(snapshot.byDomain['adservice.google.com']).toBe(1);
  });

  it('handles invalid inputs and errors safely', async () => {
    // Non-string or null domain
    recordBlockEvent(null);
    recordBlockEvent(123);
    expect(getStatsSnapshot().totalBlocked).toBe(0);

    // Storage error during flush
    vi.spyOn(mockChrome.storage.local, 'set').mockRejectedValueOnce(new Error('Storage failure'));
    await expect(flushStats()).resolves.not.toThrow();
  });
});
