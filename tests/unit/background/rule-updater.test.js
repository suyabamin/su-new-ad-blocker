import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMockChrome } from '../../fixtures/chrome-mock.js';

describe('rule-updater (src/background/rule-updater.js)', () => {
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChrome();
    globalThis.chrome = mockChrome;
  });

  it('sets up 24-hour FILTER_UPDATE alarm (AC-TD.2-2)', async () => {
    const { setupRuleUpdaterAlarm, ALARM_NAME, ALARM_PERIOD_MINUTES } =
      await import('../../../src/background/rule-updater.js');

    setupRuleUpdaterAlarm();

    const alarm = await mockChrome.alarms.get(ALARM_NAME);
    expect(alarm).toBeDefined();
    expect(alarm.periodInMinutes).toBe(ALARM_PERIOD_MINUTES);
    expect(ALARM_PERIOD_MINUTES).toBe(24 * 60);
  });

  it('updateRules succeeds and writes stats:meta to chrome.storage.local (AC-TD.2-4)', async () => {
    const { updateRules } = await import('../../../src/background/rule-updater.js');
    const result = await updateRules();

    expect(result.ok).toBe(true);
    const meta = await mockChrome.storage.local.get('stats:meta');
    expect(meta['stats:meta']).toBeDefined();
    expect(meta['stats:meta'].lastRuleUpdate).toBeDefined();
  });

  it('catches and logs errors without throwing (AC-TD.2-3)', async () => {
    const { updateRules } = await import('../../../src/background/rule-updater.js');

    // Force storage failure
    vi.spyOn(mockChrome.storage.local, 'set').mockRejectedValueOnce(new Error('Storage disk full'));

    const result = await updateRules();
    expect(result.ok).toBe(false);
    expect(result.error).toContain('Storage disk full');
  });
});
