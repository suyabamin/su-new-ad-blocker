import { describe, it, expect } from 'vitest';
import { MSG } from '../../../src/shared/messages.js';

describe('MSG constants (src/shared/messages.js)', () => {
  it('is a frozen object (AC-T0.2-1)', () => {
    expect(MSG).toBeDefined();
    expect(typeof MSG).toBe('object');
    expect(Object.isFrozen(MSG)).toBe(true);
  });

  it('contains non-empty strings for all values (AC-T0.2-1)', () => {
    const values = Object.values(MSG);
    expect(values.length).toBeGreaterThan(0);
    values.forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value.trim().length).toBeGreaterThan(0);
    });
  });

  it('contains only unique values (AC-T0.2-1)', () => {
    const values = Object.values(MSG);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('matches all specified constants in docs/09_MESSAGING_CONTRACT.md (AC-T0.2-5)', () => {
    const expected = {
      GET_GLOBAL_STATS: 'GET_GLOBAL_STATS',
      GET_DOMAIN_STATS: 'GET_DOMAIN_STATS',
      GET_TOP_DOMAINS: 'GET_TOP_DOMAINS',
      RESET_STATS: 'RESET_STATS',
      SET_ENABLED: 'SET_ENABLED',
      GET_ENABLED: 'GET_ENABLED',
      ADD_WHITELIST_ENTRY: 'ADD_WHITELIST_ENTRY',
      REMOVE_WHITELIST_ENTRY: 'REMOVE_WHITELIST_ENTRY',
      GET_WHITELIST: 'GET_WHITELIST',
      TRIGGER_FILTER_UPDATE: 'TRIGGER_FILTER_UPDATE',
      GET_FILTER_STATUS: 'GET_FILTER_STATUS',
    };

    expect(MSG).toEqual(expected);
  });

  it('prevents modification or addition of properties', () => {
    expect(() => {
      MSG.NEW_PROPERTY = 'NEW_PROPERTY';
    }).toThrow();
  });
});
