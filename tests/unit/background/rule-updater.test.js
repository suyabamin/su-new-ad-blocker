import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createMockChrome } from '../../fixtures/chrome-mock.js';

const LIST_URLS = {
  easylist: 'https://easylist.to/easylist/easylist.txt',
  easyprivacy: 'https://easylist.to/easylist/easyprivacy.txt',
};
const RULE_IDS = { easylist: 50_000, easyprivacy: 52_000, allow: 60_000, pause: 100_000 };

function validList(name, domainSuffix) {
  return `[Adblock Plus 2.0]\n! Title: ${name}\n${Array.from(
    { length: 120 },
    (_, index) => `||cdn${index}.${domainSuffix}^`
  ).join('\n')}`;
}

describe('background unit tests', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChrome();
    globalThis.chrome = mockChrome;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        const id = url.includes('easyprivacy') ? 'easyprivacy' : 'easylist';
        const name = id === 'easyprivacy' ? 'EasyPrivacy' : 'EasyList';
        return {
          ok: true,
          url: LIST_URLS[id],
          headers: { get: () => null },
          text: async () => validList(name, `${id}.example`),
        };
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('rule-updater (src/background/rule-updater.js)', () => {
    it('sets up 24-hour FILTER_UPDATE alarm and handles trigger (AC-TD.2-2)', async () => {
      const { setupRuleUpdaterAlarm, handleAlarm, ALARM_NAME, ALARM_PERIOD_MINUTES } =
        await import('../../../src/background/rule-updater.js');

      setupRuleUpdaterAlarm();

      const alarm = await mockChrome.alarms.get(ALARM_NAME);
      expect(alarm).toBeDefined();
      expect(alarm.periodInMinutes).toBe(ALARM_PERIOD_MINUTES);
      expect(ALARM_PERIOD_MINUTES).toBe(24 * 60);

      // Directly test handleAlarm for both branches
      await handleAlarm({ name: ALARM_NAME });
      await handleAlarm({ name: 'OTHER' });
      await handleAlarm(null);
    });

    it('handles environment without chrome.alarms safely', async () => {
      const saved = globalThis.chrome;
      globalThis.chrome = {};
      const { setupRuleUpdaterAlarm } = await import('../../../src/background/rule-updater.js');
      expect(() => setupRuleUpdaterAlarm()).not.toThrow();
      globalThis.chrome = saved;
    });

    it('downloads, validates, compiles, and atomically replaces the managed dynamic rules', async () => {
      const { updateRules } = await import('../../../src/background/rule-updater.js');
      const result = await updateRules();

      expect(result.ok).toBe(true);
      expect(result.count).toBe(240);
      expect(globalThis.fetch).toHaveBeenCalledTimes(2);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        LIST_URLS.easylist,
        expect.objectContaining({ credentials: 'omit', redirect: 'error' })
      );
      expect(mockChrome._internal.dynamicRules).toHaveLength(240);
      const meta = await mockChrome.storage.local.get('stats:meta');
      expect(meta['stats:meta']).toBeDefined();
      expect(meta['stats:meta'].lastRuleUpdate).toBeDefined();
      const result2 = await updateRules();
      expect(result2.ok).toBe(true);
      expect(mockChrome._internal.dynamicRules).toHaveLength(240);
    });

    it('keeps the last working rules when all downloads fail', async () => {
      mockChrome._internal.dynamicRules.push({
        id: RULE_IDS.easylist,
        priority: 1,
        action: { type: 'block' },
      });
      mockChrome._internal.dynamicRules.push({ id: RULE_IDS.pause, action: { type: 'allow' } });
      globalThis.fetch.mockRejectedValue(new Error('offline'));
      const saved = globalThis.chrome;
      globalThis.chrome = {};
      const { updateRules } = await import('../../../src/background/rule-updater.js');
      const res = await updateRules();
      expect(res.ok).toBe(false);
      globalThis.chrome = saved;
      const second = await updateRules();
      expect(second.ok).toBe(false);
      expect(mockChrome._internal.dynamicRules).toHaveLength(2);
    });

    it('keeps the prior rules for a failed source while replacing a successful source', async () => {
      mockChrome._internal.dynamicRules.push({ id: RULE_IDS.easylist, action: { type: 'block' } });
      mockChrome._internal.dynamicRules.push({ id: RULE_IDS.allow, action: { type: 'allow' } });
      mockChrome._internal.dynamicRules.push({ id: RULE_IDS.pause, action: { type: 'allow' } });
      globalThis.fetch.mockImplementation(async (url) => {
        if (url.includes('easylist.txt')) throw new Error('offline');
        return {
          ok: true,
          url: LIST_URLS.easyprivacy,
          headers: { get: () => null },
          text: async () => validList('EasyPrivacy', 'easyprivacy.example'),
        };
      });
      const { updateRules } = await import('../../../src/background/rule-updater.js');

      const result = await updateRules();

      expect(result).toMatchObject({ ok: true, failedSources: 1, count: 122 });
      expect(mockChrome._internal.dynamicRules).toHaveLength(123);
      expect(mockChrome._internal.dynamicRules.map((rule) => rule.id)).toContain(RULE_IDS.easylist);
      expect(mockChrome._internal.dynamicRules.map((rule) => rule.id)).toContain(RULE_IDS.allow);
      expect(mockChrome._internal.dynamicRules.map((rule) => rule.id)).toContain(RULE_IDS.pause);
      expect(mockChrome._internal.dynamicRules.map((rule) => rule.id)).toContain(
        RULE_IDS.easyprivacy
      );
    });

    it('rejects short or invalid list responses without replacing rules', async () => {
      mockChrome._internal.dynamicRules.push({ id: RULE_IDS.easylist, action: { type: 'block' } });
      globalThis.fetch.mockResolvedValue({
        ok: true,
        url: LIST_URLS.easylist,
        headers: { get: () => null },
        text: async () => '[Adblock Plus 2.0]\n! Title: EasyList\n||one.example^',
      });
      const { updateRules } = await import('../../../src/background/rule-updater.js');
      const result = await updateRules();
      expect(result.ok).toBe(false);
      expect(mockChrome._internal.dynamicRules).toHaveLength(1);
    });
  });

  describe('service-worker (src/background/service-worker.js)', () => {
    it('initializes service-worker module cleanly and tests handleInstalled', async () => {
      const { handleInstalled, initServiceWorker } =
        await import('../../../src/background/service-worker.js');
      initServiceWorker();
      // handleInstalled is void; verify it resolves without throwing
      await expect(handleInstalled({ reason: 'install' })).resolves.toBeUndefined();
    });
  });
});
