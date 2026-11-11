import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockChrome } from '../../fixtures/chrome-mock.js';

describe('background unit tests', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChrome();
    globalThis.chrome = mockChrome;
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

    it('updateRules succeeds and writes stats:meta to chrome.storage.local (AC-TD.2-4)', async () => {
      const { updateRules } = await import('../../../src/background/rule-updater.js');
      const result = await updateRules();

      expect(result.ok).toBe(true);
      const meta = await mockChrome.storage.local.get('stats:meta');
      expect(meta['stats:meta']).toBeDefined();
      expect(meta['stats:meta'].lastRuleUpdate).toBeDefined();

      // Run again to cover the branch where stats:meta already exists
      const result2 = await updateRules();
      expect(result2.ok).toBe(true);
    });

    it('handles environment without chrome.storage safely in updateRules', async () => {
      const saved = globalThis.chrome;
      globalThis.chrome = {};
      const { updateRules } = await import('../../../src/background/rule-updater.js');
      const res = await updateRules();
      expect(res.ok).toBe(true);
      globalThis.chrome = saved;
    });

    it('catches and logs errors without throwing (AC-TD.2-3)', async () => {
      const { updateRules } = await import('../../../src/background/rule-updater.js');

      // Force storage failure
      vi.spyOn(mockChrome.storage.local, 'set').mockRejectedValueOnce(
        new Error('Storage disk full')
      );

      const result = await updateRules();
      expect(result.ok).toBe(false);
      expect(result.error).toContain('Storage disk full');
    });
  });

  describe('service-worker (src/background/service-worker.js)', () => {
    it('initializes service-worker module cleanly and tests handleInstalled', async () => {
      const { handleInstalled, initServiceWorker } =
        await import('../../../src/background/service-worker.js');
      initServiceWorker();
      const res = await handleInstalled({ reason: 'install' });
      expect(res.ok).toBe(true);
    });
  });
});
