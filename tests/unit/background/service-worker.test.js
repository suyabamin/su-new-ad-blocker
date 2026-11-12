import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pruneOldStats,
  setupAlarms,
  setupAlarmListener,
} from '../../../src/background/service-worker.js';

describe('service-worker module (src/background/service-worker.js)', () => {
  let storageGetMock;
  let storageRemoveMock;
  let alarmsCreateMock;
  let alarmsAddListenerMock;

  beforeEach(() => {
    storageGetMock = vi.fn().mockResolvedValue({});
    storageRemoveMock = vi.fn().mockResolvedValue(undefined);
    alarmsCreateMock = vi.fn();
    alarmsAddListenerMock = vi.fn();

    global.chrome = {
      storage: {
        local: {
          get: storageGetMock,
          remove: storageRemoveMock,
        },
      },
      alarms: {
        create: alarmsCreateMock,
        onAlarm: {
          addListener: alarmsAddListenerMock,
        },
      },
    };
  });

  describe('setupAlarms', () => {
    it('creates stats-prune and list-update daily alarms', () => {
      setupAlarms();
      expect(alarmsCreateMock).toHaveBeenCalledWith('stats-prune', { periodInMinutes: 1440 });
      expect(alarmsCreateMock).toHaveBeenCalledWith('list-update', { periodInMinutes: 1440 });
    });
  });

  describe('setupAlarmListener', () => {
    it('registers an onAlarm listener', () => {
      setupAlarmListener();
      expect(alarmsAddListenerMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('pruneOldStats', () => {
    it('removes keys older than retention period (90 days)', async () => {
      const now = new Date('2026-11-12T00:00:00Z').getTime();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      // 100 days ago -> 2026-08-04
      // 10 days ago -> 2026-11-02
      storageGetMock.mockResolvedValue({
        'stats:day:2026-08-04': { totalBlocked: 10 },
        'stats:day:2026-11-02': { totalBlocked: 5 },
        'stats:lifetime': { totalBlocked: 15 },
      });

      const pruned = await pruneOldStats(90);

      expect(pruned).toContain('stats:day:2026-08-04');
      expect(pruned).not.toContain('stats:day:2026-11-02');
      expect(storageRemoveMock).toHaveBeenCalledWith(['stats:day:2026-08-04']);

      vi.restoreAllMocks();
    });

    it('returns empty array when no stats keys exceed retention cutoff', async () => {
      storageGetMock.mockResolvedValue({
        'stats:day:2026-11-10': { totalBlocked: 2 },
      });

      const pruned = await pruneOldStats(90);
      expect(pruned).toEqual([]);
      expect(storageRemoveMock).not.toHaveBeenCalled();
    });
  });
});
