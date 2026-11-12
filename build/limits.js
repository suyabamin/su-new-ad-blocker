// Chrome declarativeNetRequest static limits specification.
// See official Chrome documentation:
// https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest#property-MAX_NUMBER_OF_STATIC_RULES

export const DNR_LIMITS = Object.freeze({
  /** Maximum number of rules allowed in a single static ruleset file */
  MAX_RULES_PER_RULESET: 30_000,
  /** Maximum number of static rules guaranteed to be enabled across all static rulesets */
  MAX_ENABLED_STATIC_RULES: 30_000,
  /** Maximum number of static rulesets an extension can declare */
  MAX_STATIC_RULESETS: 50,
  /** Maximum number of dynamic rules */
  MAX_DYNAMIC_RULES: 5_000,
});
