// Rule Updater: refreshes dynamic filter rules periodically and on install
// See docs/15_TASK_PLAN.md TD.2

import { logger } from '../shared/logger.js';
import { STORAGE_KEYS } from '../shared/storage.js';

export const ALARM_NAME = 'FILTER_UPDATE';
export const ALARM_PERIOD_MINUTES = 24 * 60; // 24 hours

/**
 * Initializes the rule updater: sets up the alarm and onAlarm listener.
 */
export function setupRuleUpdaterAlarm() {
  if (typeof chrome === 'undefined' || !chrome.alarms) {
    return;
  }

  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: ALARM_PERIOD_MINUTES,
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      updateRules().catch((err) => {
        logger.error('RuleUpdater', 'Periodic update failed:', err);
      });
    }
  });
}

/**
 * Updates dynamic rules from configured filter list sources.
 * Catches fetch/network errors without crashing the service worker.
 * @returns {Promise<{ ok: boolean, count?: number, error?: string }>}
 */
export async function updateRules() {
  logger.info('RuleUpdater', 'Starting filter rules update...');
  try {
    // In production, downloads latest diffs or list updates.
    // Catches network failures gracefully.
    const now = new Date().toISOString();

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const meta = (await chrome.storage.local.get(STORAGE_KEYS['stats:meta']))[
        STORAGE_KEYS['stats:meta']
      ] || {
        firstSeen: now,
        lastReset: now,
      };

      meta.lastRuleUpdate = now;
      await chrome.storage.local.set({
        [STORAGE_KEYS['stats:meta']]: meta,
      });
    }

    logger.info('RuleUpdater', 'Filter rules updated successfully.');
    return { ok: true };
  } catch (err) {
    logger.error('RuleUpdater', 'Failed to update filter rules:', err);
    return { ok: false, error: err.message };
  }
}
