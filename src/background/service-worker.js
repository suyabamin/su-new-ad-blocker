// Background Service Worker entry point (Manifest V3)
// Coordinates network blocking, rule updates, stats tracking, and message routing.

import { logger } from '../shared/logger.js';
import { setupRuleUpdaterAlarm, updateRules } from './rule-updater.js';

logger.info('ServiceWorker', 'Service worker starting up...');

// Wire up alarms and update handlers
setupRuleUpdaterAlarm();

if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener((details) => {
    logger.info('ServiceWorker', `Extension installed/updated with reason: ${details.reason}`);
    updateRules().catch((err) => {
      logger.error('ServiceWorker', 'Failed initial rule update on install:', err);
    });
  });
}
