// src/background/badge.js
// Manages the extension action badge count and visibility based on user settings.

import { logger } from '../shared/logger.js';
import { STORAGE_KEYS, getWithDefaults } from '../shared/storage.js';
import { DEFAULT_SETTINGS } from '../shared/settings.js';
import { getStatsSnapshot } from './stats.js';

export const BADGE_COLOR = '#e74c3c';

/**
 * Formats a numeric count for display in the extension badge.
 * Max 4 characters fits comfortably in Chromium action badges.
 *
 * @param {number} count
 * @returns {string}
 */
export function formatBadgeCount(count) {
  if (typeof count !== 'number' || count <= 0) {
    return '';
  }
  if (count > 9999) {
    return `${Math.floor(count / 1000)}k+`;
  }
  if (count > 999) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

/**
 * Updates the extension badge text with today's blocked count or clears it if disabled.
 *
 * @param {number} [explicitCount]
 * @returns {Promise<void>}
 */
export async function updateBadge(explicitCount) {
  if (typeof chrome === 'undefined' || !chrome.action || !chrome.action.setBadgeText) {
    logger.debug('Badge', 'chrome.action not available, skipping badge update');
    return;
  }

  try {
    let settings = DEFAULT_SETTINGS;
    if (chrome.storage && chrome.storage.local) {
      settings = await getWithDefaults(
        chrome.storage.local,
        STORAGE_KEYS.settings,
        DEFAULT_SETTINGS
      );
    }

    if (!settings.showBadge) {
      await chrome.action.setBadgeText({ text: '' });
      return;
    }

    const count =
      typeof explicitCount === 'number' ? explicitCount : (getStatsSnapshot()?.todayBlocked ?? 0);

    const text = formatBadgeCount(count);
    await chrome.action.setBadgeText({ text });

    if (text && chrome.action.setBadgeBackgroundColor) {
      await chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR });
    }
  } catch (err) {
    logger.error('Badge', 'Failed to update badge:', err);
  }
}

/**
 * Clears the extension badge.
 * @returns {Promise<void>}
 */
export async function clearBadge() {
  if (typeof chrome === 'undefined' || !chrome.action || !chrome.action.setBadgeText) {
    return;
  }
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch (err) {
    logger.error('Badge', 'Failed to clear badge:', err);
  }
}
