// Popup script: handles popup UI interactions and displays live blocking statistics
// See docs/15_TASK_PLAN.md TG.1

import { MSG } from '../shared/messages.js';

export const UI_STRINGS = Object.freeze({
  PAUSE_BUTTON_ACTIVE: 'Blocking Paused on this site',
  PAUSE_BUTTON_INACTIVE: 'Pause on this site',
  NO_ACTIVE_SITE: 'No active webpage',
});

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
 * Initializes popup UI listeners and queries background for current stats.
 */
export async function initPopup() {
  const siteDisplay = document.getElementById('current-site-display');
  const pauseButton = document.getElementById('pause-site-button');
  const tabBlockedDisplay = document.getElementById('tab-blocked-count');
  const todayBlockedDisplay = document.getElementById('today-blocked-count');
  const openOptionsButton = document.getElementById('open-options-button');

  if (openOptionsButton && typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
    openOptionsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }

  // Query active tab hostname
  let currentHostname = '';
  if (typeof chrome !== 'undefined' && chrome.tabs?.query) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        const url = new URL(tab.url);
        currentHostname = url.hostname;
      }
    } catch {
      // url parse or tabs query failure
    }
  }

  if (siteDisplay) {
    siteDisplay.textContent = currentHostname || UI_STRINGS.NO_ACTIVE_SITE;
  }

  // Request today summary stats
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: MSG.GET_TODAY_SUMMARY }, (response) => {
      if (response?.ok && todayBlockedDisplay) {
        todayBlockedDisplay.textContent = String(response.data.todayBlocked || 0);
      }
    });

    if (currentHostname) {
      chrome.runtime.sendMessage(
        { type: MSG.GET_TAB_STATS, hostname: currentHostname },
        (response) => {
          if (response?.ok && tabBlockedDisplay) {
            tabBlockedDisplay.textContent = String(response.data.count || 0);
          }
        }
      );
    }
  }

  // Set up pause site button toggle
  if (pauseButton && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    pauseButton.addEventListener('click', () => {
      const currentlyPaused = pauseButton.getAttribute('aria-checked') === 'true';
      const newPausedState = !currentlyPaused;

      chrome.runtime.sendMessage(
        { type: MSG.TOGGLE_PAUSE_SITE, hostname: currentHostname, paused: newPausedState },
        () => {
          updatePauseButton(pauseButton, newPausedState);
        }
      );
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
