import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS, dailyStatsKey, getListCacheKey } from '../../../src/shared/storage.js';

// AC-TC.1-4: parity test with explicit literals from docs/10_STORAGE_SCHEMA.md Section 1

const EXPECTED_STORAGE_KEYS = {
  schemaVersion: 'schemaVersion',
  settings: 'settings',
  lists: 'lists',
  allowlist: 'allowlist',
  customRules: 'customRules',
  'stats:lifetime': 'stats:lifetime',
  'stats:meta': 'stats:meta',
};

describe('STORAGE_KEYS (src/shared/storage.js)', () => {
  it('is a frozen object (AC-TC.1-4)', () => {
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });

  it('has exactly 7 keys (AC-TC.1-4)', () => {
    expect(Object.keys(STORAGE_KEYS)).toHaveLength(7);
  });

  it('values are unique non-empty strings (AC-TC.1-4)', () => {
    const values = Object.values(STORAGE_KEYS);
    for (const v of values) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
    expect(new Set(values).size).toBe(values.length);
  });

  it('matches the canonical 7 keys from docs/10_STORAGE_SCHEMA.md explicitly (AC-TC.1-4)', () => {
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
  it('formats a valid YYYY-MM-DD string correctly (AC-TC.1-5)', () => {
    expect(dailyStatsKey('2026-11-12')).toBe('stats:day:2026-11-12');
    expect(dailyStatsKey('2000-01-01')).toBe('stats:day:2000-01-01');
    expect(dailyStatsKey('1999-12-31')).toBe('stats:day:1999-12-31');
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
    expect(() => dailyStatsKey('12-11-2026')).toThrow(TypeError); // wrong order
    expect(() => dailyStatsKey('2026/11/12')).toThrow(TypeError); // wrong separator
    expect(() => dailyStatsKey('2026-1-1')).toThrow(TypeError); // no zero-padding
    expect(() => dailyStatsKey('20261112')).toThrow(TypeError); // no dashes
  });
});

describe('getListCacheKey (src/shared/storage.js)', () => {
  it('formats valid listId strings correctly (AC-TC.1-6)', () => {
    expect(getListCacheKey('easylist')).toBe('cache:lists:easylist');
    expect(getListCacheKey('easyprivacy')).toBe('cache:lists:easyprivacy');
    expect(getListCacheKey('my-list-1')).toBe('cache:lists:my-list-1');
    expect(getListCacheKey('list_v2')).toBe('cache:lists:list_v2');
  });

  it('throws TypeError for non-string inputs (AC-TC.1-6)', () => {
    expect(() => getListCacheKey(null)).toThrow(TypeError);
    expect(() => getListCacheKey(undefined)).toThrow(TypeError);
    expect(() => getListCacheKey(123)).toThrow(TypeError);
    expect(() => getListCacheKey({})).toThrow(TypeError);
  });

  it('throws TypeError for empty string or invalid characters (AC-TC.1-6)', () => {
    expect(() => getListCacheKey('')).toThrow(TypeError);
    expect(() => getListCacheKey('   ')).toThrow(TypeError); // spaces not in [a-z0-9_-]
    expect(() => getListCacheKey('EasyList')).toThrow(TypeError); // uppercase not allowed
    expect(() => getListCacheKey('easy.list')).toThrow(TypeError); // dot not allowed
    expect(() => getListCacheKey('easy/list')).toThrow(TypeError); // slash not allowed
  });
});
