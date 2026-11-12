// src/content/cosmetic.js
// Generic Cosmetic Content Script: injects CSS and installs MutationObserver to hide ad containers.
// Debounces mutations by 100ms, stops after 60s without matches, and batches CS_BLOCKED_REPORT (max 1 per 2s).

import { GENERIC_SELECTORS as IMPORTED_SELECTORS } from './selectors.js';
import { MSG } from '../shared/messages.js';

export const GENERIC_SELECTORS =
  (typeof globalThis !== 'undefined' && globalThis.__SU_GENERIC_SELECTORS__) ||
  IMPORTED_SELECTORS ||
  [];

export const STYLE_ELEMENT_ID = 'su-cosmetic-styles';
export const CS_REPORT_INTERVAL_MS = 2000;
export const OBSERVER_DEBOUNCE_MS = 100;
export const OBSERVER_IDLE_TIMEOUT_MS = 60_000;

let pendingReportCount = 0;
let reportTimer = null;

/** Reset module state between tests (exported for test use only). */
export function _resetQueueState() {
  if (reportTimer !== null) {
    clearTimeout(reportTimer);
  }
  pendingReportCount = 0;
  reportTimer = null;
}

/**
 * Batches cosmetic block counts and dispatches CS_BLOCKED_REPORT at most once per 2 seconds.
 *
 * @param {number} count
 * @param {string} [hostname]
 * @param {'cosmetic' | 'youtube'} [type='cosmetic']
 */
export function queueBlockedReport(count, hostname, type = 'cosmetic') {
  if (typeof count !== 'number' || count <= 0) {
    return;
  }
  pendingReportCount += count;

  if (reportTimer !== null) {
    return;
  }

  reportTimer = setTimeout(() => {
    reportTimer = null;
    const toReport = pendingReportCount;
    pendingReportCount = 0;

    const rt = globalThis.chrome?.runtime;
    if (toReport > 0 && rt?.sendMessage) {
      const host =
        hostname || (typeof window !== 'undefined' ? window.location?.hostname : 'cosmetic');
      rt.sendMessage({
        type: MSG.CS_BLOCKED_REPORT,
        payload: {
          count: toReport,
          type,
          hostname: host,
        },
      });
    }
  }, CS_REPORT_INTERVAL_MS);
}

/**
 * Builds CSS stylesheet string applying display:none !important to all selectors.
 * @param {string[]} selectors
 * @returns {string}
 */
export function buildCosmeticCss(selectors) {
  if (!selectors || selectors.length === 0) {
    return '';
  }
  return selectors.map((sel) => `${sel} { display: none !important; }`).join('\n');
}

/**
 * Injects a <style> tag into document.documentElement at document_start.
 * Never creates or injects <script> tags.
 *
 * @param {Document} doc
 * @param {string[]} selectors
 * @returns {HTMLStyleElement|null}
 */
export function injectCosmeticStyles(doc = document, selectors = GENERIC_SELECTORS) {
  if (!doc || !doc.documentElement) {
    return null;
  }

  let styleEl = doc.getElementById(STYLE_ELEMENT_ID);
  if (styleEl) {
    return styleEl;
  }

  styleEl = doc.createElement('style');
  styleEl.id = STYLE_ELEMENT_ID;
  styleEl.textContent = buildCosmeticCss(selectors);

  doc.documentElement.appendChild(styleEl);
  return styleEl;
}

/**
 * Installs a MutationObserver to hide dynamic ad containers as they appear.
 * Uses 100ms debounce and disconnects after 60s of inactivity.
 *
 * @param {Document} doc
 * @param {string[]} selectors
 * @returns {MutationObserver|null}
 */
export function installCosmeticObserver(doc = document, selectors = GENERIC_SELECTORS) {
  if (typeof MutationObserver === 'undefined' || !doc || !doc.body || !selectors.length) {
    return null;
  }

  const combinedSelector = selectors.join(', ');
  let debounceTimeout = null;
  let idleTimeout = null;

  const hideMatchingNodes = () => {
    try {
      const matches = doc.querySelectorAll(combinedSelector);
      let matchCount = 0;
      for (const el of matches) {
        if (el.style.display !== 'none') {
          el.style.setProperty('display', 'none', 'important');
          matchCount++;
        }
      }
      if (matchCount > 0) {
        queueBlockedReport(matchCount);
        resetIdleTimer();
      }
    } catch {
      // Invalid selector or DOM detached
    }
  };

  const resetIdleTimer = () => {
    if (idleTimeout !== null) {
      clearTimeout(idleTimeout);
    }
    idleTimeout = setTimeout(() => {
      observer.disconnect();
    }, OBSERVER_IDLE_TIMEOUT_MS);
  };

  const observer = new MutationObserver((mutations) => {
    let directMatches = 0;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          if (node.matches && node.matches(combinedSelector)) {
            if (node.style.display !== 'none') {
              node.style.setProperty('display', 'none', 'important');
              directMatches++;
            }
          }
        }
      }
    }
    if (directMatches > 0) {
      queueBlockedReport(directMatches);
      resetIdleTimer();
    }

    if (debounceTimeout !== null) {
      clearTimeout(debounceTimeout);
    }
    debounceTimeout = setTimeout(() => {
      debounceTimeout = null;
      hideMatchingNodes();
    }, OBSERVER_DEBOUNCE_MS);
  });

  observer.observe(doc.body, {
    childList: true,
    subtree: true,
  });

  hideMatchingNodes();
  resetIdleTimer();
  return observer;
}

/**
 * Entry point for content script execution.
 */
export async function initCosmeticScript() {
  if (typeof document === 'undefined') {
    return;
  }

  // Check user settings if chrome runtime is available
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: MSG.SETTINGS_GET, payload: {} }, (res) => {
      if (res?.ok && res.data && res.data.cosmeticEnabled === false) {
        // Cosmetic filtering is disabled by user setting
        return;
      }
      setupCosmeticInjection();
    });
  } else {
    setupCosmeticInjection();
  }
}

function setupCosmeticInjection() {
  injectCosmeticStyles(document, GENERIC_SELECTORS);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      installCosmeticObserver(document, GENERIC_SELECTORS);
    });
  } else {
    installCosmeticObserver(document, GENERIC_SELECTORS);
  }
}

initCosmeticScript();
