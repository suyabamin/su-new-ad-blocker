// Generic Cosmetic Content Script: injects CSS and installs MutationObserver to hide ad containers
// See docs/15_TASK_PLAN.md TF.1

import { GENERIC_SELECTORS as IMPORTED_SELECTORS } from './selectors.js';

export const GENERIC_SELECTORS =
  (typeof globalThis !== 'undefined' && globalThis.__SU_GENERIC_SELECTORS__) ||
  IMPORTED_SELECTORS ||
  [];

export const STYLE_ELEMENT_ID = 'su-cosmetic-styles';

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

  // Prevent duplicate injection
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
 *
 * @param {Document} doc
 * @param {string[]} selectors
 * @returns {MutationObserver|null}
 */
export function installCosmeticObserver(doc = document, selectors = GENERIC_SELECTORS) {
  if (typeof MutationObserver === 'undefined' || !doc || !doc.body) {
    return null;
  }

  const combinedSelector = selectors.join(', ');

  const hideMatchingNodes = (root) => {
    if (!root || !root.querySelectorAll) {
      return;
    }
    const matches = root.querySelectorAll(combinedSelector);
    for (const el of matches) {
      el.style.setProperty('display', 'none', 'important');
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          // Element node
          if (node.matches && node.matches(combinedSelector)) {
            node.style.setProperty('display', 'none', 'important');
          }
          hideMatchingNodes(node);
        }
      }
    }
  });

  observer.observe(doc.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

/**
 * Entry point for content script execution.
 */
export function initCosmeticScript() {
  if (typeof document === 'undefined') {
    return;
  }

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
