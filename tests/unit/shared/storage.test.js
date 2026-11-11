import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS, getDailyStatsKey, getListCacheKey } from '../../../src/shared/storage.js';

describe('STORAGE_KEYS & pattern key helpers (src/shared/storage.js)', () => {
  it('is a frozen object (AC-T0.2-2)', () => {
    expect(STORAGE_KEYS).toBeDefined();
    expect(typeof STORAGE_KEYS).toBe('object');
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });

  it('contains non-empty strings for all values (AC-T0.2-2)', () => {
    const values = Object.values(STORAGE_KEYS);
    expect(values.length).toBe(7);
    values.forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    });
  });

  it('contains only unique values (AC-T0.2-2)', () => {
    const values = Object.values(STORAGE_KEYS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('matches all specified keys in docs/10_STORAGE_SCHEMA.md explicitly (AC-T0.2-5)', () => {
    // Explicitly typed from docs/10_STORAGE_SCHEMA.md Section 1 table
    const EXPECTED_STORAGE_KEYS = {
      STATS_GLOBAL: 'stats_global',
      STATS_BY_DOMAIN: 'stats_by_domain',
      STATS_LAST_RESET: 'stats_last_reset',
      ENABLED: 'enabled',
      WHITELIST: 'whitelist',
      FILTER_LAST_UPDATED: 'filter_last_updated',
      SETTINGS: 'settings',
    };

    expect(STORAGE_KEYS).toEqual(EXPECTED_STORAGE_KEYS);
    expect(Object.keys(STORAGE_KEYS).sort()).toEqual(Object.keys(EXPECTED_STORAGE_KEYS).sort());
  });

  it('prevents modification or addition of properties', () => {
    expect(() => {
      STORAGE_KEYS.NEW_KEY = 'new_key';
    }).toThrow();
  });

  describe('getDailyStatsKey helper', () => {
    it('formats a YYYY-MM-DD string correctly', () => {
      expect(getDailyStatsKey('2026-11-12')).toBe('stats:day:2026-11-12');
    });

    it('formats a valid Date object correctly', () => {
      const date = new Date(2026, 10, 12); // Month is 0-indexed: 10 = November
      expect(getDailyStatsKey(date)).toBe('stats:day:2026-11-12');
    });

    it('throws on invalid date string or non-date inputs', () => {
      expect(() => getDailyStatsKey('invalid-date')).toThrow();
      expect(() => getDailyStatsKey('12-11-2026')).toThrow();
      expect(() => getDailyStatsKey(null)).toThrow();
      expect(() => getDailyStatsKey(undefined)).toThrow();
      expect(() => getDailyStatsKey(12345)).toThrow();
      expect(() => getDailyStatsKey(new Date('invalid'))).toThrow();
    });
  });

  describe('getListCacheKey helper', () => {
    it('formats filter list cache keys correctly', () => {
      expect(getListCacheKey('easylist')).toBe('cache:lists:easylist');
      expect(getListCacheKey('easyprivacy')).toBe('cache:lists:easyprivacy');
    });

    it('throws on empty, whitespace, or invalid listId', () => {
      expect(() => getListCacheKey('')).toThrow();
      expect(() => getListCacheKey('   ')).toThrow();
      expect(() => getListCacheKey(null)).toThrow();
      expect(() => getListCacheKey(undefined)).toThrow();
      expect(() => getListCacheKey(123)).toThrow();
    });
  });
});
