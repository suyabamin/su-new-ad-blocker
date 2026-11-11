import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS } from '../../../src/shared/storage.js';

describe('STORAGE_KEYS constants (src/shared/storage.js)', () => {
  it('is a frozen object (AC-T0.2-2)', () => {
    expect(STORAGE_KEYS).toBeDefined();
    expect(typeof STORAGE_KEYS).toBe('object');
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });

  it('contains non-empty strings for all values (AC-T0.2-2)', () => {
    const values = Object.values(STORAGE_KEYS);
    expect(values.length).toBeGreaterThan(0);
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

  it('matches all specified keys in docs/10_STORAGE_SCHEMA.md (AC-T0.2-5)', () => {
    const expected = {
      STATS_GLOBAL: 'stats_global',
      STATS_BY_DOMAIN: 'stats_by_domain',
      STATS_LAST_RESET: 'stats_last_reset',
      ENABLED: 'enabled',
      WHITELIST: 'whitelist',
      FILTER_LAST_UPDATED: 'filter_last_updated',
      SETTINGS: 'settings',
    };

    expect(STORAGE_KEYS).toEqual(expected);
  });

  it('prevents modification or addition of properties', () => {
    expect(() => {
      STORAGE_KEYS.NEW_KEY = 'new_key';
    }).toThrow();
  });
});
