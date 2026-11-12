import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordBlockEvent,
  flushStats,
  getStatsSnapshot,
  resetInMemoryStats,
  updateTopDomains,
  syncMatchedRules,
  recordDnrMatchedRequest,
  MAX_TOP_DOMAINS,
} from '../../../src/background/stats-tracker.js';
import { STORAGE_KEYS, dailyStatsKey } from '../../../src/shared/storage.js';
import {
  DYNAMIC_ALLOW_RULE_ID_OFFSET,
  DYNAMIC_RULE_ID_OFFSET,
} from '../../../src/shared/filter-lists.js';

describe('stats-tracker (src/background/stats-tracker.js)', () => {
  let storageSetMock;
  let sessionValues;

  beforeEach(() => {
    vi.useFakeTimers();
    storageSetMock = vi.fn().mockResolvedValue(undefined);
    sessionValues = {};
    globalThis.chrome = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: storageSetMock,
        },
        session: {
          get: vi.fn(async (key) => ({ [key]: sessionValues[key] })),
          set: vi.fn(async (values) => Object.assign(sessionValues, values)),
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
        networkStatsAvailable: false,
      });
    });
  });

  it('counts distinct blocking request events and ignores allow rules', async () => {
    const snapshot = getStatsSnapshot();
    expect(
      await recordDnrMatchedRequest({
        rule: { ruleId: DYNAMIC_RULE_ID_OFFSET + 7 },
        request: { requestId: 'request-1', initiator: 'https://publisher.test' },
      })
    ).toBe(true);
    expect(
      await recordDnrMatchedRequest({
        rule: { ruleId: DYNAMIC_RULE_ID_OFFSET + 7 },
        request: { requestId: 'request-1', initiator: 'https://publisher.test' },
      })
    ).toBe(false);
    expect(
      await recordDnrMatchedRequest({
        rule: { ruleId: DYNAMIC_ALLOW_RULE_ID_OFFSET },
        request: { requestId: 'request-2', initiator: 'https://publisher.test' },
      })
    ).toBe(false);
    expect(getStatsSnapshot().today.byType.network).toBe(snapshot.today.byType.network + 1);
    expect(getStatsSnapshot().byDomain).toEqual({ 'publisher.test': 1 });
    expect(getStatsSnapshot().today.byList).toEqual({ easylist: 1 });
    expect(await syncMatchedRules()).toEqual({});
  });

  it('restores request deduplication after tracker reinitialization', async () => {
    const event = {
      rule: { ruleId: DYNAMIC_RULE_ID_OFFSET + 7 },
      request: { requestId: 'persistent-request', initiator: 'https://publisher.test' },
    };
    expect(await recordDnrMatchedRequest(event)).toBe(true);
    resetInMemoryStats();
    expect(await recordDnrMatchedRequest(event)).toBe(false);
    expect(globalThis.chrome.storage.session.set).toHaveBeenCalledWith({
      [STORAGE_KEYS['stats:seenNetworkRequests']]: ['persistent-request'],
    });
  });

  it('does not count a request when durable session deduplication fails', async () => {
    globalThis.chrome.storage.session.set.mockRejectedValueOnce(new Error('Session write failed'));
    expect(
      await recordDnrMatchedRequest({
        rule: { ruleId: DYNAMIC_RULE_ID_OFFSET + 7 },
        request: { requestId: 'unpersisted-request', initiator: 'https://publisher.test' },
      })
    ).toBe(false);
    expect(getStatsSnapshot().today.byType.network).toBe(0);
    expect(getStatsSnapshot().networkStatsAvailable).toBe(false);
  });
});
