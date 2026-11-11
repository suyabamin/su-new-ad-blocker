import { describe, it, expect } from 'vitest';
import { MSG, isKnownType } from '../../../src/shared/messages.js';

// AC-TC.1-1 and AC-TC.1-2: parity test with explicit literals from docs/09_MESSAGING_CONTRACT.md

const EXPECTED_MSG = {
  GET_TAB_STATS: 'GET_TAB_STATS',
  GET_TODAY_SUMMARY: 'GET_TODAY_SUMMARY',
  GET_STATS_RANGE: 'GET_STATS_RANGE',
  GET_TOP_DOMAINS: 'GET_TOP_DOMAINS',
  TOGGLE_PAUSE_SITE: 'TOGGLE_PAUSE_SITE',
  GET_COSMETIC_RULES: 'GET_COSMETIC_RULES',
  CS_BLOCKED_REPORT: 'CS_BLOCKED_REPORT',
  ALLOWLIST_ADD: 'ALLOWLIST_ADD',
  ALLOWLIST_REMOVE: 'ALLOWLIST_REMOVE',
  LIST_TOGGLE: 'LIST_TOGGLE',
  LIST_UPDATE_NOW: 'LIST_UPDATE_NOW',
  CUSTOM_RULES_SET: 'CUSTOM_RULES_SET',
  STATS_EXPORT: 'STATS_EXPORT',
  STATS_RESET: 'STATS_RESET',
  SETTINGS_GET: 'SETTINGS_GET',
  SETTINGS_SET: 'SETTINGS_SET',
};

describe('MSG (src/shared/messages.js)', () => {
  it('is a frozen object (AC-TC.1-1)', () => {
    expect(Object.isFrozen(MSG)).toBe(true);
  });

  it('has exactly 16 keys (AC-TC.1-1)', () => {
    expect(Object.keys(MSG)).toHaveLength(16);
  });

  it('every value equals its key name (AC-TC.1-1)', () => {
    for (const [key, value] of Object.entries(MSG)) {
      expect(value).toBe(key);
    }
  });

  it('values are unique (AC-TC.1-1)', () => {
    const values = Object.values(MSG);
    expect(new Set(values).size).toBe(values.length);
  });

  it('matches the canonical 16 types from docs/09_MESSAGING_CONTRACT.md explicitly (AC-TC.1-2)', () => {
    expect(MSG).toEqual(EXPECTED_MSG);
    expect(Object.keys(MSG).sort()).toEqual(Object.keys(EXPECTED_MSG).sort());
  });

  it('is immutable — adding a property throws in strict mode (AC-TC.1-1)', () => {
    expect(() => {
      MSG.NEW_TYPE = 'NEW_TYPE';
    }).toThrow();
  });
});

describe('isKnownType (src/shared/messages.js)', () => {
  it('returns true for every MSG value (AC-TC.1-3)', () => {
    for (const value of Object.values(MSG)) {
      expect(isKnownType(value)).toBe(true);
    }
  });

  it('returns false for unknown strings (AC-TC.1-3)', () => {
    expect(isKnownType('UNKNOWN_TYPE')).toBe(false);
    expect(isKnownType('')).toBe(false);
    expect(isKnownType('get_tab_stats')).toBe(false); // wrong case
  });

  it('returns false for non-string inputs (AC-TC.1-3)', () => {
    expect(isKnownType(null)).toBe(false);
    expect(isKnownType(undefined)).toBe(false);
    expect(isKnownType(123)).toBe(false);
    expect(isKnownType({})).toBe(false);
  });
});
