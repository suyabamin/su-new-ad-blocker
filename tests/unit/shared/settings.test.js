import { describe, it, expect } from 'vitest';
import { DEFAULT_SETTINGS, validateSettingsPatch } from '../../../src/shared/settings.js';

// AC-TC.1-7 and AC-TC.1-8: settings structure and patch validation per Section 2

describe('DEFAULT_SETTINGS (src/shared/settings.js)', () => {
  it('is a frozen object (AC-TC.1-7)', () => {
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
  });

  it('has the exact shape from Section 2 (AC-TC.1-7)', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      blockingEnabled: true,
      cosmeticEnabled: true,
      youtubeEnabled: true,
      scriptletsEnabled: false,
      showBadge: true,
      locale: 'en',
    });
  });

  it('has correct types for every key (AC-TC.1-7)', () => {
    expect(typeof DEFAULT_SETTINGS.blockingEnabled).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.cosmeticEnabled).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.youtubeEnabled).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.scriptletsEnabled).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.showBadge).toBe('boolean');
    expect(typeof DEFAULT_SETTINGS.locale).toBe('string');
  });
});

describe('validateSettingsPatch (src/shared/settings.js)', () => {
  it('returns ok:true with no errors for a valid partial patch (AC-TC.1-8)', () => {
    expect(validateSettingsPatch({ blockingEnabled: false })).toEqual({ ok: true, errors: [] });
    expect(validateSettingsPatch({ cosmeticEnabled: false, showBadge: false })).toEqual({
      ok: true,
      errors: [],
    });
    expect(validateSettingsPatch({ locale: 'en' })).toEqual({ ok: true, errors: [] });
    expect(validateSettingsPatch({})).toEqual({ ok: true, errors: [] });
  });

  it('returns ok:false with error when locale is not "en"', () => {
    const result = validateSettingsPatch({ locale: 'fr' });
    expect(result.ok).toBe(false);
    expect(result.errors).toContain('locale must be "en"');
  });

  it('returns ok:false with errors for unknown keys', () => {
    const result = validateSettingsPatch({ unknownKey: true });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('unknownKey');
  });

  it('returns ok:false with errors for wrong value types', () => {
    const result = validateSettingsPatch({ blockingEnabled: 'yes' });
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toContain('blockingEnabled');
    expect(result.errors[0]).toContain('boolean');
  });

  it('accumulates multiple errors', () => {
    const result = validateSettingsPatch({ blockingEnabled: 'yes', locale: 42 });
    expect(result.ok).toBe(false);
    expect(result.errors).toHaveLength(2);
  });

  it('returns ok:false for non-object patch', () => {
    expect(validateSettingsPatch(null).ok).toBe(false);
    expect(validateSettingsPatch('string').ok).toBe(false);
    expect(validateSettingsPatch(42).ok).toBe(false);
    expect(validateSettingsPatch([]).ok).toBe(false);
  });
});
