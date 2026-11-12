// Default settings and patch validator for the extension.
// See docs/10_STORAGE_SCHEMA.md Section 3 for the shape.

/** Default settings written on first install and used as fallback. */
export const DEFAULT_SETTINGS = Object.freeze({
  blockingEnabled: true,
  cosmeticEnabled: true,
  youtubeEnabled: true,
  scriptletsEnabled: false,
  showBadge: true,
  locale: 'en',
});

/** All recognised setting keys and their expected JS types. */
const SETTING_TYPES = Object.freeze({
  blockingEnabled: 'boolean',
  cosmeticEnabled: 'boolean',
  youtubeEnabled: 'boolean',
  scriptletsEnabled: 'boolean',
  showBadge: 'boolean',
  locale: 'string',
});

/**
 * Validates a partial settings patch object.
 * Unknown keys and wrong types are reported as errors; locale must be "en".
 *
 * @param {object} patch - Partial settings object from a SETTINGS_SET message payload.
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateSettingsPatch(patch) {
  const errors = [];

  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) {
    return { ok: false, errors: ['patch must be a plain object'] };
  }

  for (const [key, value] of Object.entries(patch)) {
    if (!Object.prototype.hasOwnProperty.call(SETTING_TYPES, key)) {
      errors.push(`unknown setting key: "${key}"`);
      continue;
    }
    const expectedType = SETTING_TYPES[key];
    if (typeof value !== expectedType) {
      errors.push(`"${key}" must be a ${expectedType}, got ${typeof value}`);
      continue;
    }
    if (key === 'locale' && value !== 'en') {
      errors.push('locale must be "en"');
    }
  }

  return { ok: errors.length === 0, errors };
}
