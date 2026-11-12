// src/popup/popup.js
// Handles popup UI interactions, queries live statistics, and toggles site blocking pause.

import { MSG } from '../shared/messages.js';

export const UI_STRINGS = Object.freeze({
  PAUSE_BUTTON_ACTIVE: 'Blocking Paused on this site',
  PAUSE_BUTTON_INACTIVE: 'Pause on this site',
  NO_ACTIVE_SITE: 'No active webpage',
  RESTRICTED_PAGE: 'Restricted Page',
  RESTRICTED_MESSAGE: 'Ad blocking cannot run on internal or restricted browser pages.',
  NETWORK_UNAVAILABLE: 'Unavailable in this build',
});

export function formatNetworkCount(available, count) {
  return available ? String(count ?? 0) : UI_STRINGS.NETWORK_UNAVAILABLE;
}

function applyPopupMessages() {
  if (!globalThis.chrome?.i18n?.getMessage) {
    return;
  }
  for (const element of document.querySelectorAll('[data-i18n]')) {
    const message = globalThis.chrome.i18n.getMessage(element.dataset.i18n);
    if (message) {
      element.textContent = message;
    }
  }
}

/**
 * Updates UI labels based on pause state.
 * @param {HTMLButtonElement} button
 * @param {boolean} isPaused
 */
export function updatePauseButton(button, isPaused) {
  if (!button) {
    return;
  }
  button.setAttribute('aria-checked', String(isPaused));
  const textSpan = button.querySelector('.btn-text');
  if (textSpan) {
    textSpan.textContent = isPaused
      ? UI_STRINGS.PAUSE_BUTTON_ACTIVE
      : UI_STRINGS.PAUSE_BUTTON_INACTIVE;
  }
}

/**
 * Checks if a URL is a restricted browser internal page.
 * @param {string} url
 * @returns {boolean}
 */
export function isRestrictedUrl(url) {
  if (!url || typeof url !== 'string') {
    return true;
  }
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools://')
  );
}

/**
 * Queries the active tab's hostname using activeTab permission.
 * @returns {Promise<string|null>} Hostname or null if restricted/unavailable
 */
export async function getActiveTabHostname() {
  if (typeof chrome === 'undefined' || !chrome.tabs || !chrome.tabs.query) {
    return null;
  }
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (!activeTab || !activeTab.url) {
        resolve(null);
        return;
      }
      if (isRestrictedUrl(activeTab.url)) {
        resolve(null);
        return;
      }
      try {
        const urlObj = new URL(activeTab.url);
        resolve(urlObj.hostname.toLowerCase());
      } catch {
        resolve(null);
      }
    });
  });
}

/**
 * Initializes popup UI listeners and queries background for live stats.
 */
export async function initPopup() {
  applyPopupMessages();
  const siteDisplay = document.getElementById('current-site-display');
  const pauseButton = document.getElementById('pause-site-button');
  const tabBlockedDisplay = document.getElementById('tab-blocked-count');
  const todayBlockedDisplay = document.getElementById('today-blocked-count');
  const openOptionsButton = document.getElementById('open-options-button');
  const statusContainer = document.getElementById('status-container');
  const networkDisplay = document.getElementById('count-network');
  const cosmeticDisplay = document.getElementById('count-cosmetic');
  const youtubeDisplay = document.getElementById('count-youtube');
  const youtubeDetectedDisplay = document.getElementById('count-youtube-detected');
  const youtubeUnhiddenDisplay = document.getElementById('count-youtube-unhidden');

  if (openOptionsButton && typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    openOptionsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  const hostname = await getActiveTabHostname();

  if (hostname) {
    if (siteDisplay) {
      siteDisplay.textContent = hostname;
    }

    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: MSG.GET_TAB_STATS, payload: { hostname } }, (response) => {
        if (response?.ok && tabBlockedDisplay) {
          tabBlockedDisplay.textContent = formatNetworkCount(
            response.data?.available === true,
            response.data?.count
          );
        }
      });
    }

    if (pauseButton && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      pauseButton.addEventListener('click', () => {
        chrome.runtime.sendMessage(
          { type: MSG.TOGGLE_PAUSE_SITE, payload: { domain: hostname } },
          (response) => {
            if (response?.ok) {
              updatePauseButton(pauseButton, Boolean(response.data?.isPaused));
            }
          }
        );
      });
    }
  } else {
    if (siteDisplay) {
      siteDisplay.textContent = UI_STRINGS.RESTRICTED_PAGE;
    }
    if (statusContainer) {
      statusContainer.textContent = UI_STRINGS.RESTRICTED_MESSAGE;
      statusContainer.removeAttribute('hidden');
    }
    if (pauseButton) {
      pauseButton.setAttribute('disabled', 'true');
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: MSG.GET_TODAY_SUMMARY }, (response) => {
      if (response?.ok && response.data) {
        if (todayBlockedDisplay) {
          todayBlockedDisplay.textContent = formatNetworkCount(
            response.data.networkStatsAvailable === true,
            response.data.todayBlocked
          );
        }
        if (networkDisplay) {
          networkDisplay.textContent = formatNetworkCount(
            response.data.networkStatsAvailable === true,
            response.data.byType?.network
          );
        }
        if (cosmeticDisplay) {
          cosmeticDisplay.textContent = String(response.data.byType?.cosmetic || 0);
        }
        if (youtubeDisplay) {
          youtubeDisplay.textContent = String(response.data.byType?.youtube || 0);
        }
        const youtubeDetected = response.data.byType?.youtubeDetected || 0;
        const youtubeHidden = response.data.byType?.youtube || 0;
        if (youtubeDetectedDisplay) {
          youtubeDetectedDisplay.textContent = String(youtubeDetected);
        }
        if (youtubeUnhiddenDisplay) {
          youtubeUnhiddenDisplay.textContent = String(Math.max(0, youtubeDetected - youtubeHidden));
        }
      }
    });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }
}
