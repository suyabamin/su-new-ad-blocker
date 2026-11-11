// Background Service Worker entry point (Manifest V3)
// Coordinates network blocking, rule updates, stats tracking, and message routing.

import { logger } from '../shared/logger.js';
import { setupRuleUpdaterAlarm, updateRules } from './rule-updater.js';
import { initStats, setupDnrRuleMatchedListener } from './stats.js';
import { setupMessageRouter } from './stats-api.js';

export function handleInstalled(details) {
  logger.info('ServiceWorker', `Extension installed/updated with reason: ${details?.reason}`);
  return updateRules();
}

export function initServiceWorker() {
  logger.info('ServiceWorker', 'Service worker starting up...');
  setupRuleUpdaterAlarm();
  setupDnrRuleMatchedListener();
  setupMessageRouter();
  initStats();

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(handleInstalled);
  }
}

initServiceWorker();
