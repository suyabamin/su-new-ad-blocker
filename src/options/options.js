// Options & Dashboard script
// See docs/15_TASK_PLAN.md TG.2

import { MSG } from '../shared/messages.js';

export const DOMAIN_REGEX = /^[a-z0-9][a-z0-9\-.]*\.[a-z]{2,}$/i;

/**
 * Validates domain string against canonical hostname format.
 * @param {string} domain
 * @returns {boolean}
 */
export function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  return DOMAIN_REGEX.test(domain.trim());
}

/**
 * Renders the domain allowlist in the UI.
 * @param {HTMLUListElement} listElement
 * @param {string[]} allowlist
 * @param {function} onRemove
 */
export function renderAllowlist(listElement, allowlist, onRemove) {
  if (!listElement) {
    return;
  }
  listElement.innerHTML = '';

  for (const domain of allowlist) {
    const li = document.createElement('li');
    li.className = 'domain-item';

    const span = document.createElement('span');
    span.textContent = domain;

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn-secondary';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => onRemove(domain));

    li.appendChild(span);
    li.appendChild(removeBtn);
    listElement.appendChild(li);
  }
}

/**
 * Initializes the options dashboard.
 */
export async function initOptions() {
  const form = document.getElementById('allowlist-form');
  const input = document.getElementById('allowlist-input');
  const errorDisplay = document.getElementById('allowlist-error');
  const listElement = document.getElementById('allowlist-items');
  const totalBlockedSpan = document.getElementById('stat-total-blocked');
  const exportBtn = document.getElementById('export-stats-btn');
  const resetBtn = document.getElementById('reset-stats-btn');

  let allowlist = [];

  const refreshSummary = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: MSG.GET_TODAY_SUMMARY }, (res) => {
        if (res?.ok && totalBlockedSpan) {
          totalBlockedSpan.textContent = String(res.data.totalBlocked || 0);
        }
      });
    }
  };

  const handleRemove = (domain) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: MSG.ALLOWLIST_REMOVE, domain }, (res) => {
        if (res?.ok) {
          allowlist = allowlist.filter((d) => d !== domain);
          renderAllowlist(listElement, allowlist, handleRemove);
        }
      });
    }
  };

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const domain = input.value.trim().toLowerCase();

      if (!isValidDomain(domain)) {
        if (errorDisplay) {
          errorDisplay.textContent = 'Please enter a valid domain name (e.g. example.com)';
        }
        return;
      }

      if (errorDisplay) {
        errorDisplay.textContent = '';
      }

      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: MSG.ALLOWLIST_ADD, domain }, (res) => {
          if (res?.ok) {
            if (!allowlist.includes(domain)) {
              allowlist.push(domain);
              renderAllowlist(listElement, allowlist, handleRemove);
            }
            input.value = '';
          }
        });
      }
    });
  }

  if (resetBtn && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all blocking statistics?')) {
        chrome.runtime.sendMessage({ type: MSG.STATS_RESET }, () => {
          refreshSummary();
        });
      }
    });
  }

  if (exportBtn && typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    exportBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: MSG.STATS_EXPORT }, (res) => {
        if (res?.ok && res.data) {
          const blob = new Blob([JSON.stringify(res.data, null, 2)], {
            type: 'application/json',
          });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'su-ad-blocker-stats.json';
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    });
  }

  refreshSummary();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptions);
  } else {
    initOptions();
  }
}
