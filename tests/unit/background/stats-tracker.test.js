import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordBlockEvent,
  flushStats,
  getStatsSnapshot,
  resetInMemoryStats,
  updateTopDomains,
  syncMatchedRules,
  MAX_TOP_DOMAINS,
} from '../../../src/background/stats-tracker.js';
import { STORAGE_KEYS, dailyStatsKey } from '../../../src/shared/storage.js';

describe('stats-tracker (src/background/stats-tracker.js)', () => {
  let storageSetMock;

  beforeEach(() => {
    vi.useFakeTimers();
    storageSetMock = vi.fn().mockResolvedValue(undefined);
    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: storageSetMock,
        },
      },
    };
    resetInMemoryStats();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('updateTopDomains', () => {
    it('caps dictionary at MAX_TOP_DOMAINS (50) and drops lowest count entries', () => {
      const topDomains = {};
      for (let i = 1; i <= 55; i++) {
        updateTopDomains(topDomains, `domain-${i}.com`, i);
      }

      const keys = Object.keys(topDomains);
      expect(keys).toHaveLength(MAX_TOP_DOMAINS);

      // Low count domains (1 to 5) should have been dropped
      expect(topDomains['domain-1.com']).toBeUndefined();
      expect(topDomains['domain-5.com']).toBeUndefined();
      // High count domain (55) must be present
      expect(topDomains['domain-55.com']).toBe(55);
    });
  });

  describe('event categorization and schema compliance', () => {
    it('records network, cosmetic, and youtube block types in byType and lifetime', async () => {
      recordBlockEvent('ads.network.com', 'network', 'easylist');
      recordBlockEvent('page.example.com', 'cosmetic', null, 3);
      recordBlockEvent('youtube.com', 'youtube', null, 2);

      const snapshot = getStatsSnapshot();
      expect(snapshot.today.total).toBe(1);
      expect(snapshot.today.byType.network).toBe(1);
      expect(snapshot.today.byType.cosmetic).toBe(3);
      expect(snapshot.today.byType.youtube).toBe(2);
      expect(snapshot.today.byList.easylist).toBe(1);

      expect(snapshot.lifetime.total).toBe(1);
      expect(snapshot.lifetime.byType.network).toBe(1);
      expect(snapshot.lifetime.byType.cosmetic).toBe(3);
      expect(snapshot.lifetime.byType.youtube).toBe(2);

      await flushStats();
      expect(storageSetMock).toHaveBeenCalledTimes(1);

      const savedData = storageSetMock.mock.calls[0][0];
      const todayKey = dailyStatsKey(snapshot.todayDate);

      expect(savedData[STORAGE_KEYS['stats:lifetime']]).toEqual({
        total: 1,
        totalBlocked: 1,
        byType: { network: 1, cosmetic: 3, youtube: 2 },
      });

      expect(savedData[todayKey]).toEqual({
        date: snapshot.todayDate,
        total: 1,
        totalBlocked: 1,
        byType: { network: 1, cosmetic: 3, youtube: 2 },
        byList: { easylist: 1 },
        topDomains: { 'ads.network.com': 1 },
        byDomain: { 'ads.network.com': 1 },
      });
    });
  });

  it('counts each matched request once, skips paused tabs, and keeps daily total equal to tab deltas', async () => {
    const first = [
      { tabId: 1, timeStamp: 100, rule: { ruleId: 7 } },
      { tabId: 1, timeStamp: 101, rule: { ruleId: 7 } },
      { tabId: 2, timeStamp: 102, rule: { ruleId: 8 } },
    ];
    const next = [...first, { tabId: 1, timeStamp: 103, rule: { ruleId: 7 } }];
    globalThis.chrome.declarativeNetRequest = {
      getMatchedRules: vi
        .fn()
        .mockResolvedValueOnce({ rulesMatchedInfo: first })
        .mockResolvedValueOnce({ rulesMatchedInfo: next }),
    };
    globalThis.chrome.tabs = {
      get: vi.fn(async (tabId) => ({
        url: tabId === 1 ? 'https://publisher.test/article' : 'https://paused.test/',
      })),
    };
    const { pauseDomain, resetRulesManagerState } =
      await import('../../../src/background/rules-manager.js');
    resetRulesManagerState();
    await pauseDomain('paused.test');

    const firstDeltas = await syncMatchedRules();
    const secondDeltas = await syncMatchedRules();

    const snapshot = getStatsSnapshot();
    expect(snapshot.today.byType.network).toBe(3);
    expect(snapshot.byDomain).toEqual({ 'publisher.test': 3 });
    const tabDeltaTotal = [...Object.values(firstDeltas), ...Object.values(secondDeltas)].reduce(
      (sum, count) => sum + count,
      0
    );
    expect(snapshot.today.total).toBe(tabDeltaTotal);
    resetRulesManagerState();
  });
});
