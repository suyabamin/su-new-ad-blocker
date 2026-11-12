import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateBadge,
  clearBadge,
  formatBadgeCount,
  BADGE_COLOR,
} from '../../../src/background/badge.js';
import { STORAGE_KEYS } from '../../../src/shared/storage.js';

describe('badge module (src/background/badge.js)', () => {
  let setBadgeTextMock;
  let setBadgeBackgroundColorMock;
  let storageGetMock;

  beforeEach(() => {
    setBadgeTextMock = vi.fn().mockResolvedValue(undefined);
    setBadgeBackgroundColorMock = vi.fn().mockResolvedValue(undefined);
    storageGetMock = vi.fn().mockResolvedValue({});

    global.chrome = {
      action: {
        setBadgeText: setBadgeTextMock,
        setBadgeBackgroundColor: setBadgeBackgroundColorMock,
      },
      storage: {
        local: {
          get: storageGetMock,
        },
      },
    };
  });

  describe('formatBadgeCount', () => {
    it('returns empty string for non-positive numbers or invalid values', () => {
      expect(formatBadgeCount(0)).toBe('');
      expect(formatBadgeCount(-5)).toBe('');
      expect(formatBadgeCount(null)).toBe('');
      expect(formatBadgeCount(undefined)).toBe('');
    });

    it('returns literal string for counts under 1000', () => {
      expect(formatBadgeCount(1)).toBe('1');
      expect(formatBadgeCount(42)).toBe('42');
      expect(formatBadgeCount(999)).toBe('999');
    });

    it('formats thousands with decimal k notation', () => {
      expect(formatBadgeCount(1200)).toBe('1.2k');
      expect(formatBadgeCount(4500)).toBe('4.5k');
    });

    it('formats large numbers > 9999 with k+ notation', () => {
      expect(formatBadgeCount(10000)).toBe('10k+');
      expect(formatBadgeCount(25400)).toBe('25k+');
    });
  });

  describe('updateBadge', () => {
    it('sets badge text and color when showBadge is enabled', async () => {
      storageGetMock.mockResolvedValue({
        [STORAGE_KEYS.settings]: { showBadge: true },
      });

      await updateBadge(42);

      expect(setBadgeTextMock).toHaveBeenCalledWith({ text: '42' });
      expect(setBadgeBackgroundColorMock).toHaveBeenCalledWith({ color: BADGE_COLOR });
    });

    it('clears badge text when showBadge is disabled in settings', async () => {
      storageGetMock.mockResolvedValue({
        [STORAGE_KEYS.settings]: { showBadge: false },
      });

      await updateBadge(42);

      expect(setBadgeTextMock).toHaveBeenCalledWith({ text: '' });
      expect(setBadgeBackgroundColorMock).not.toHaveBeenCalled();
    });

    it('clears badge when count is zero', async () => {
      await updateBadge(0);
      expect(setBadgeTextMock).toHaveBeenCalledWith({ text: '' });
    });
  });

  describe('clearBadge', () => {
    it('invokes setBadgeText with empty string', async () => {
      await clearBadge();
      expect(setBadgeTextMock).toHaveBeenCalledWith({ text: '' });
    });
  });
});
