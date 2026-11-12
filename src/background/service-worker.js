// Background Service Worker entry point (Manifest V3)
// Coordinates network blocking, rule updates, stats tracking, alarms, and badge updates.

import { logger } from '../shared/logger.js';
import { updateRules } from './rule-updater.js';
import { initStats, setupDnrRuleMatchedListener } from './stats.js';
import { setupMessageRouter } from './message-router.js';
import { updateBadge } from './badge.js';

export const RETENTION_DAYS = 90;

/**
 * Prunes daily stats buckets older than 90 days from chrome.storage.local.
 * @param {number} [retentionDays=90]
 * @returns {Promise<string[]>} Keys removed
 */
export async function pruneOldStats(retentionDays = RETENTION_DAYS) {
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    return [];
  }

  const allData = await chrome.storage.local.get(null);
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const keysToRemove = [];

  for (const key of Object.keys(allData)) {
    if (key.startsWith('stats:day:')) {
      const datePart = key.slice('stats:day:'.length);
      const entryTime = Date.parse(`${datePart}T00:00:00Z`);
      if (!Number.isNaN(entryTime) && entryTime < cutoffTime) {
        keysToRemove.push(key);
      }
    }
  }

  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    logger.info('ServiceWorker', `Pruned ${keysToRemove.length} expired daily stats buckets`);
  }
  return keysToRemove;
}

/**
 * Sets up periodic alarms for stats retention pruning and filter list updates.
 */
export function setupAlarms() {
  if (typeof chrome === 'undefined' || !chrome.alarms || !chrome.alarms.create) {
    return;
  }
  chrome.alarms.create('stats-prune', { periodInMinutes: 1440 });
  chrome.alarms.create('list-update', { periodInMinutes: 1440 });
}

/**
 * Registers listeners for chrome.alarms.onAlarm.
 */
export function setupAlarmListener() {
  if (typeof chrome === 'undefined' || !chrome.alarms || !chrome.alarms.onAlarm) {
    return;
  }
  chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'stats-prune') {
      try {
        await pruneOldStats();
      } catch (err) {
        logger.error('ServiceWorker', 'Failed to prune stats on alarm:', err);
      }
    } else if (alarm.name === 'list-update') {
      try {
        await updateRules();
      } catch (err) {
        logger.error('ServiceWorker', 'Failed to update rules on alarm:', err);
      }
    }
  });
}

/**
 * Handles extension installation or update.
 * @param {object} details
 */
export async function handleInstalled(details) {
  logger.info('ServiceWorker', `Extension installed/updated with reason: ${details?.reason}`);
  setupAlarms();
  try {
    await updateRules();
  } catch (err) {
    logger.error('ServiceWorker', 'updateRules failed on install:', err);
  }
}

/**
 * Initializes the service worker and each subsystem within protected error boundaries.
 */
export function initServiceWorker() {
  logger.info('ServiceWorker', 'Service worker starting up...');

  try {
    initStats().catch((err) => {
      logger.error('ServiceWorker', 'initStats error:', err);
    });
  } catch (err) {
    logger.error('ServiceWorker', 'initStats failed:', err);
  }

  try {
    setupDnrRuleMatchedListener();
  } catch (err) {
    logger.error('ServiceWorker', 'setupDnrRuleMatchedListener failed:', err);
  }

  try {
    setupMessageRouter();
  } catch (err) {
    logger.error('ServiceWorker', 'setupMessageRouter failed:', err);
  }

  try {
    setupAlarms();
    setupAlarmListener();
  } catch (err) {
    logger.error('ServiceWorker', 'setupAlarms failed:', err);
  }

  try {
    updateBadge().catch((err) => {
      logger.error('ServiceWorker', 'updateBadge error:', err);
    });
  } catch (err) {
    logger.error('ServiceWorker', 'updateBadge failed:', err);
  }

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(handleInstalled);
  }
}

initServiceWorker();
