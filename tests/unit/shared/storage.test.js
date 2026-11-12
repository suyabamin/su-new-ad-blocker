import { describe, it, expect } from 'vitest';
import {
  STORAGE_KEYS,
  dailyStatsKey,
  listCacheKey,
  getListCacheKey,
  getWithDefaults,
} from '../../../src/shared/storage.js';

// Parity test with explicit literals from Section 2
const EXPECTED_STORAGE_KEYS = {
  schemaVersion: 'schemaVersion',
  settings: 'settings',
  lists: 'lists',
  allowlist: 'allowlist',
  customRules: 'customRules',
  'stats:lifetime': 'stats:lifetime',
  'stats:meta': 'stats:meta',
  'stats:seenNetworkRequests': 'stats:seenNetworkRequests',
};

describe('STORAGE_KEYS (src/shared/storage.js)', () => {
  it('is a frozen object (AC-TC.1-4)', () => {
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });

  it('has exactly 8 keys (AC-TC.1-4)', () => {
    expect(Object.keys(STORAGE_KEYS)).toHaveLength(8);
  });

  it('values are unique non-empty strings (AC-TC.1-4)', () => {
    const values = Object.values(STORAGE_KEYS);
    for (const v of values) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
    expect(new Set(values).size).toBe(values.length);
  });

  it('matches the canonical 8 keys from Section 2 explicitly (AC-TC.1-4)', () => {
    expect(STORAGE_KEYS).toEqual(EXPECTED_STORAGE_KEYS);
    expect(Object.keys(STORAGE_KEYS).sort()).toEqual(Object.keys(EXPECTED_STORAGE_KEYS).sort());
  });

  it('is immutable — adding a property throws in strict mode (AC-TC.1-4)', () => {
    expect(() => {
      STORAGE_KEYS.NEW_KEY = 'new_key';
    }).toThrow();
  });
});

describe('dailyStatsKey (src/shared/storage.js)', () => {
  it('formats a valid calendar YYYY-MM-DD string correctly (AC-TC.1-5)', () => {
    expect(dailyStatsKey('2026-11-12')).toBe('stats:day:2026-11-12');
    expect(dailyStatsKey('2000-01-01')).toBe('stats:day:2000-01-01');
    expect(dailyStatsKey('1999-12-31')).toBe('stats:day:1999-12-31');
    expect(dailyStatsKey('2024-02-29')).toBe('stats:day:2024-02-29'); // Leap year valid
  });

  it('throws TypeError for impossible calendar dates like 2024-02-30', () => {
    expect(() => dailyStatsKey('2024-02-30')).toThrow(TypeError);
    expect(() => dailyStatsKey('2023-02-29')).toThrow(TypeError); // Not a leap year
    expect(() => dailyStatsKey('2026-04-31')).toThrow(TypeError); // April has 30 days
    expect(() => dailyStatsKey('2026-13-01')).toThrow(TypeError); // Month 13
    expect(() => dailyStatsKey('2026-00-10')).toThrow(TypeError); // Month 00
    expect(() => dailyStatsKey('2026-05-00')).toThrow(TypeError); // Day 00
    expect(() => dailyStatsKey('2026-05-32')).toThrow(TypeError); // Day 32
  });

  it('throws TypeError for non-string inputs (AC-TC.1-5)', () => {
    expect(() => dailyStatsKey(null)).toThrow(TypeError);
    expect(() => dailyStatsKey(undefined)).toThrow(TypeError);
    expect(() => dailyStatsKey(12345)).toThrow(TypeError);
    expect(() => dailyStatsKey(new Date())).toThrow(TypeError);
    expect(() => dailyStatsKey({})).toThrow(TypeError);
  });

  it('throws TypeError for strings not matching YYYY-MM-DD (AC-TC.1-5)', () => {
    expect(() => dailyStatsKey('')).toThrow(TypeError);
    expect(() => dailyStatsKey('invalid')).toThrow(TypeError);
    expect(() => dailyStatsKey('12-11-2026')).toThrow(TypeError);
    expect(() => dailyStatsKey('2026/11/12')).toThrow(TypeError);
    expect(() => dailyStatsKey('2026-1-1')).toThrow(TypeError);
    expect(() => dailyStatsKey('20261112')).toThrow(TypeError);
  });
});

describe('listCacheKey / getListCacheKey (src/shared/storage.js)', () => {
  it('formats valid listId strings correctly (AC-TC.1-6)', () => {
    expect(listCacheKey('easylist')).toBe('cache:lists:easylist');
    expect(listCacheKey('easyprivacy')).toBe('cache:lists:easyprivacy');
    expect(listCacheKey('my-list-1')).toBe('cache:lists:my-list-1');
    expect(listCacheKey('list_v2')).toBe('cache:lists:list_v2');
    expect(getListCacheKey('easylist')).toBe('cache:lists:easylist');
  });

  it('throws TypeError for non-string inputs (AC-TC.1-6)', () => {
    expect(() => listCacheKey(null)).toThrow(TypeError);
    expect(() => listCacheKey(undefined)).toThrow(TypeError);
    expect(() => listCacheKey(123)).toThrow(TypeError);
    expect(() => listCacheKey({})).toThrow(TypeError);
  });

  it('throws TypeError for empty string or invalid characters including spaces', () => {
    expect(() => listCacheKey('')).toThrow(TypeError);
    expect(() => listCacheKey('   ')).toThrow(TypeError);
    expect(() => listCacheKey('my list')).toThrow(TypeError);
    expect(() => listCacheKey('EasyList')).toThrow(TypeError);
    expect(() => listCacheKey('easy.list')).toThrow(TypeError);
    expect(() => listCacheKey('easy/list')).toThrow(TypeError);
  });

  it('throws TypeError if listId exceeds 64 characters', () => {
    const longId = 'a'.repeat(65);
    expect(() => listCacheKey(longId)).toThrow(TypeError);

    const maxId = 'a'.repeat(64);
    expect(listCacheKey(maxId)).toBe(`cache:lists:${maxId}`);
  });
});

describe('getWithDefaults (src/shared/storage.js)', () => {
  it('reads key from area and returns stored value when present', async () => {
    const mockArea = {
      async get(key) {
        return { [key]: { enabled: true } };
      },
    };
    const value = await getWithDefaults(mockArea, 'settings', { fallback: true });
    expect(value).toEqual({ enabled: true });
  });

  it('returns defaultValue when key is missing or undefined', async () => {
    const mockArea = {
      async get() {
        return {};
      },
    };
    const fallback = { fallback: true };
    const value = await getWithDefaults(mockArea, 'settings', fallback);
    expect(value).toBe(fallback);
  });

  it('returns defaultValue when area is invalid or throws', async () => {
    const fallback = 'default';
    expect(await getWithDefaults(null, 'key', fallback)).toBe(fallback);
    expect(await getWithDefaults({}, 'key', fallback)).toBe(fallback);

    const throwingArea = {
      async get() {
        throw new Error('disk failure');
      },
    };
    expect(await getWithDefaults(throwingArea, 'key', fallback)).toBe(fallback);
  });
});
