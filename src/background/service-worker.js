// Background Service Worker entry point (Manifest V3)
// Coordinates network blocking, rule updates, stats tracking, and message routing.

import { logger } from '../shared/logger.js';
import { setupRuleUpdaterAlarm, updateRules } from './rule-updater.js';

export function handleInstalled(details) {
  logger.info('ServiceWorker', `Extension installed/updated with reason: ${details?.reason}`);
  return updateRules();
}

export function initServiceWorker() {
  logger.info('ServiceWorker', 'Service worker starting up...');
  setupRuleUpdaterAlarm();

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onInstalled) {
    chrome.runtime.onInstalled.addListener(handleInstalled);
  }
}

initServiceWorker();
