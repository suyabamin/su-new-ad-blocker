// Canonical message type constants for chrome.runtime messaging.
// All message types used anywhere in the extension MUST come from this object.
// See docs/09_MESSAGING_CONTRACT.md

export const MSG = Object.freeze({
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
});

/**
 * Returns true if the given value is a known MSG type string.
 * Use in message handlers to guard against unknown types.
 * @param {unknown} type
 * @returns {boolean}
 */
export function isKnownType(type) {
  return Object.prototype.hasOwnProperty.call(MSG, type) && MSG[type] === type;
}
