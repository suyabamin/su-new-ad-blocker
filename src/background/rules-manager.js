// src/background/rules-manager.js
// Manages declarativeNetRequest rulesets, dynamic allow rules (site pause), and allowlists.

import { logger } from '../shared/logger.js';

export const PAUSE_RULE_ID_OFFSET = 100_000;
export const PAUSE_RULE_PRIORITY = 100_000;

export const ALL_DYNAMIC_RESOURCE_TYPES = [
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'media',
  'websocket',
  'other',
];

// Map of domain -> ruleId
const pausedDomains = new Map();
let nextRuleId = PAUSE_RULE_ID_OFFSET;

/**
 * Resets in-memory state (useful for tests).
 */
export function resetRulesManagerState() {
  pausedDomains.clear();
  nextRuleId = PAUSE_RULE_ID_OFFSET;
}

/**
 * Enables a static ruleset by ID.
 * @param {string} rulesetId
 * @returns {Promise<void>}
 */
export async function enableRuleset(rulesetId) {
  if (
    typeof chrome === 'undefined' ||
    !chrome.declarativeNetRequest ||
    !chrome.declarativeNetRequest.updateEnabledRulesets
  ) {
    logger.debug(
      'RulesManager',
      `Skipping enableRuleset(${rulesetId}) in non-extension environment`
    );
    return;
  }
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: [rulesetId],
    });
    logger.info('RulesManager', `Enabled ruleset: ${rulesetId}`);
  } catch (err) {
    logger.error('RulesManager', `Failed to enable ruleset ${rulesetId}:`, err);
    throw err;
  }
}

/**
 * Disables a static ruleset by ID.
 * @param {string} rulesetId
 * @returns {Promise<void>}
 */
export async function disableRuleset(rulesetId) {
  if (
    typeof chrome === 'undefined' ||
    !chrome.declarativeNetRequest ||
    !chrome.declarativeNetRequest.updateEnabledRulesets
  ) {
    logger.debug(
      'RulesManager',
      `Skipping disableRuleset(${rulesetId}) in non-extension environment`
    );
    return;
  }
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: [rulesetId],
    });
    logger.info('RulesManager', `Disabled ruleset: ${rulesetId}`);
  } catch (err) {
    logger.error('RulesManager', `Failed to disable ruleset ${rulesetId}:`, err);
    throw err;
  }
}

/**
 * Adds a high-priority dynamic allow rule for the domain to pause blocking.
 * @param {string} domain
 * @returns {Promise<number>} Rule ID created or existing
 */
export async function pauseDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    throw new TypeError('domain must be a non-empty string');
  }
  const cleanDomain = domain.toLowerCase().trim();
  if (pausedDomains.has(cleanDomain)) {
    return pausedDomains.get(cleanDomain);
  }

  const ruleId = nextRuleId++;
  const rule = {
    id: ruleId,
    priority: PAUSE_RULE_PRIORITY,
    action: { type: 'allow' },
    condition: {
      urlFilter: `||${cleanDomain}^`,
      resourceTypes: [...ALL_DYNAMIC_RESOURCE_TYPES],
    },
  };

  if (
    typeof chrome !== 'undefined' &&
    chrome.declarativeNetRequest &&
    chrome.declarativeNetRequest.updateDynamicRules
  ) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        addRules: [rule],
      });
      logger.info('RulesManager', `Paused blocking on ${cleanDomain} with rule ID ${ruleId}`);
    } catch (err) {
      logger.error('RulesManager', `Failed to add dynamic allow rule for ${cleanDomain}:`, err);
      throw err;
    }
  }

  pausedDomains.set(cleanDomain, ruleId);
  return ruleId;
}

/**
 * Removes the dynamic allow rule for the domain to resume blocking.
 * @param {string} domain
 * @returns {Promise<void>}
 */
export async function resumeDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    throw new TypeError('domain must be a non-empty string');
  }
  const cleanDomain = domain.toLowerCase().trim();
  const ruleId = pausedDomains.get(cleanDomain);
  if (typeof ruleId !== 'number') {
    return;
  }

  if (
    typeof chrome !== 'undefined' &&
    chrome.declarativeNetRequest &&
    chrome.declarativeNetRequest.updateDynamicRules
  ) {
    try {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: [ruleId],
      });
      logger.info('RulesManager', `Resumed blocking on ${cleanDomain}`);
    } catch (err) {
      logger.error('RulesManager', `Failed to remove dynamic rule for ${cleanDomain}:`, err);
      throw err;
    }
  }

  pausedDomains.delete(cleanDomain);
}

/**
 * Checks if blocking is currently paused on the domain.
 * @param {string} domain
 * @returns {boolean}
 */
export function isPaused(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  return pausedDomains.has(domain.toLowerCase().trim());
}

/**
 * Returns a list of all currently paused domains.
 * @returns {string[]}
 */
export function listPaused() {
  return Array.from(pausedDomains.keys());
}
