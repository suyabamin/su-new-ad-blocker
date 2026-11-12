// src/options/options.js
// Options Dashboard: overview, top domains, filter lists, allowlist, custom rules, data.
// All UI strings via chrome.i18n.getMessage (T4.6). No hardcoded user-visible strings.
// Chart.js loaded locally via vendor/chart.umd.js (T4.1). No CDN, no remote scripts.

import { MSG } from '../shared/messages.js';

// ---------------------------------------------------------------------------
// i18n helper
// ---------------------------------------------------------------------------

/**
 * Returns a localised string from the extension's message catalog.
 * Falls back to the key when chrome.i18n is unavailable (e.g. in tests).
 * @param {string} key
 * @returns {string}
 */
export function i18n(key) {
  if (typeof chrome !== 'undefined' && chrome.i18n?.getMessage) {
    const msg = chrome.i18n.getMessage(key);
    return msg || key;
  }
  return key;
}

// ---------------------------------------------------------------------------
// Domain validation (T4.4)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Allowlist rendering (T4.4)
// ---------------------------------------------------------------------------

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
    removeBtn.textContent = i18n('btnRemove');
    removeBtn.setAttribute('aria-label', `${i18n('btnRemove')} ${domain}`);
    removeBtn.addEventListener('click', () => onRemove(domain));

    li.appendChild(span);
    li.appendChild(removeBtn);
    listElement.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// Overview chart (T4.1)
// ---------------------------------------------------------------------------

/**
 * Returns the last N days as YYYY-MM-DD strings.
 * @param {number} n
 * @returns {string[]}
 */
export function lastNDays(n) {
  const days = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    days.push(`${yyyy}-${mm}-${dd}`);
  }
  return days;
}

/** @type {Chart|null} */
let dailyChart = null;

/**
 * Resets daily chart instance (for tests).
 */
export function _resetDailyChart() {
  if (dailyChart) {
    dailyChart.destroy();
    dailyChart = null;
  }
}

/**
 * Renders or updates the daily activity chart.
 * @param {HTMLCanvasElement} canvas
 * @param {string[]} labels
 * @param {number[]} data
 * @returns {object|null}
 */
export function renderDailyChart(canvas, labels, data) {
  if (!canvas) {
    return null;
  }
  const ChartConstructor = globalThis.Chart;
  if (!ChartConstructor) {
    return null;
  }
  if (dailyChart) {
    dailyChart.destroy();
    dailyChart = null;
  }
  dailyChart = new ChartConstructor(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: i18n('chartTitle'),
          data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.1)',
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#2563eb',
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: 'index', intersect: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
  return dailyChart;
}

// ---------------------------------------------------------------------------
// Top domains table (T4.2)
// ---------------------------------------------------------------------------

/** Current sort state: { col: 'domain'|'count', dir: 'asc'|'desc' } */
let sortState = { col: 'count', dir: 'desc' };

/**
 * Renders a sortable top-domains table.
 * @param {HTMLElement} container
 * @param {Record<string,number>} topDomains
 */
export function renderTopDomains(container, topDomains) {
  if (!container) {
    return;
  }

  const entries = Object.entries(topDomains || {});

  entries.sort(([da, ca], [db, cb]) => {
    if (sortState.col === 'domain') {
      return sortState.dir === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
    }
    return sortState.dir === 'asc' ? ca - cb : cb - ca;
  });

  container.innerHTML = '';

  if (entries.length === 0) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = '—';
    container.appendChild(p);
    return;
  }

  const table = document.createElement('table');
  table.className = 'domains-table';
  table.setAttribute('aria-label', i18n('sectionTopDomains'));

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const thDomain = document.createElement('th');
  thDomain.scope = 'col';
  thDomain.setAttribute(
    'aria-sort',
    sortState.col === 'domain' ? (sortState.dir === 'asc' ? 'ascending' : 'descending') : 'none'
  );
  const sortDomainBtn = document.createElement('button');
  sortDomainBtn.className = 'sort-btn';
  sortDomainBtn.textContent = i18n('colDomain');
  sortDomainBtn.setAttribute(
    'aria-label',
    i18n(sortState.col === 'domain' && sortState.dir === 'asc' ? 'sortDesc' : 'sortAsc')
  );
  sortDomainBtn.addEventListener('click', () => {
    sortState = {
      col: 'domain',
      dir: sortState.col === 'domain' && sortState.dir === 'asc' ? 'desc' : 'asc',
    };
    renderTopDomains(container, topDomains);
  });
  thDomain.appendChild(sortDomainBtn);

  const thCount = document.createElement('th');
  thCount.scope = 'col';
  thCount.setAttribute(
    'aria-sort',
    sortState.col === 'count' ? (sortState.dir === 'asc' ? 'ascending' : 'descending') : 'none'
  );
  const sortCountBtn = document.createElement('button');
  sortCountBtn.className = 'sort-btn';
  sortCountBtn.textContent = i18n('colBlocked');
  sortCountBtn.setAttribute(
    'aria-label',
    i18n(sortState.col === 'count' && sortState.dir === 'asc' ? 'sortDesc' : 'sortAsc')
  );
  sortCountBtn.addEventListener('click', () => {
    sortState = {
      col: 'count',
      dir: sortState.col === 'count' && sortState.dir === 'asc' ? 'desc' : 'asc',
    };
    renderTopDomains(container, topDomains);
  });
  thCount.appendChild(sortCountBtn);

  headerRow.appendChild(thDomain);
  headerRow.appendChild(thCount);
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const [domain, count] of entries) {
    const tr = document.createElement('tr');
    const tdDomain = document.createElement('td');
    tdDomain.textContent = domain;
    const tdCount = document.createElement('td');
    tdCount.textContent = String(count);
    tr.appendChild(tdDomain);
    tr.appendChild(tdCount);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}

// ---------------------------------------------------------------------------
// Filter list toggles (T4.3)
// ---------------------------------------------------------------------------

/**
 * Renders filter list toggles.
 * @param {HTMLElement} container
 * @param {object} lists  - { [listId]: { name, enabled } }
 * @param {function} onToggle - (listId, enabled) => void
 */
export function renderFilterLists(container, lists, onToggle) {
  if (!container) {
    return;
  }
  container.innerHTML = '';

  const entries = Object.entries(lists || {});
  if (entries.length === 0) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = '—';
    container.appendChild(p);
    return;
  }

  for (const [listId, listMeta] of entries) {
    const row = document.createElement('div');
    row.className = 'list-row';

    const label = document.createElement('label');
    label.className = 'list-label';
    label.htmlFor = `list-toggle-${listId}`;
    label.textContent = listMeta.name || listId;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = `list-toggle-${listId}`;
    toggle.checked = !!listMeta.enabled;
    toggle.addEventListener('change', () => onToggle(listId, toggle.checked));

    row.appendChild(label);
    row.appendChild(toggle);
    container.appendChild(row);
  }
}

// ---------------------------------------------------------------------------
// Status message helper
// ---------------------------------------------------------------------------

/**
 * Shows a temporary status message in an element.
 * @param {HTMLElement} el
 * @param {string} text
 * @param {'ok'|'err'} type
 */
function showStatus(el, text, type = 'ok') {
  if (!el) {
    return;
  }
  el.textContent = text;
  el.className = type === 'err' ? 'status-msg error-msg' : 'status-msg ok-msg';
  setTimeout(() => {
    el.textContent = '';
    el.className = 'status-msg';
  }, 3000);
}

// ---------------------------------------------------------------------------
// Chrome runtime helper
// ---------------------------------------------------------------------------

/**
 * Sends a message via chrome.runtime.sendMessage, returning a Promise.
 * @param {object} message
 * @returns {Promise<object>}
 */
function sendMsg(message) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      resolve({ ok: false, error: { code: 'INTERNAL', message: 'No runtime' } });
      return;
    }
    chrome.runtime.sendMessage(message, (res) => {
      resolve(res || { ok: false, error: { code: 'INTERNAL', message: 'No response' } });
    });
  });
}

// ---------------------------------------------------------------------------
// Main init (T4.1–T4.5)
// ---------------------------------------------------------------------------

/**
 * Initializes the full options dashboard.
 */
export async function initOptions() {
  // Apply i18n to static elements
  const titleEl = document.querySelector('title');
  if (titleEl) {
    titleEl.textContent = i18n('optionsTitle');
  }
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = i18n(key);
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.setAttribute('placeholder', i18n(key));
    }
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) {
      el.setAttribute('aria-label', i18n(key));
    }
  });

  // ---- T4.1: Overview ----
  const statLifetime = document.getElementById('stat-lifetime');
  const statToday = document.getElementById('stat-today');
  const statNetwork = document.getElementById('stat-network');
  const statCosmetic = document.getElementById('stat-cosmetic');
  const statYoutube = document.getElementById('stat-youtube');
  const statYoutubeDetected = document.getElementById('stat-youtube-detected');
  const statYoutubeUnhidden = document.getElementById('stat-youtube-unhidden');
  const chartCanvas = document.getElementById('daily-chart');

  const [lifetimeRes, todayRes, rangeRes] = await Promise.all([
    sendMsg({ type: MSG.GET_TAB_STATS, payload: {} }),
    sendMsg({ type: MSG.GET_TODAY_SUMMARY, payload: {} }),
    sendMsg({ type: MSG.GET_STATS_RANGE, payload: { days: 7 } }),
  ]);

  if (lifetimeRes?.ok && lifetimeRes.data) {
    if (statLifetime) {
      statLifetime.textContent =
        lifetimeRes.data.available === true
          ? String(lifetimeRes.data.lifetime?.byType?.network ?? 0)
          : i18n('networkStatsUnavailable');
    }
  }

  if (todayRes?.ok && todayRes.data) {
    const d = todayRes.data;
    const networkAvailable = d.networkStatsAvailable === true;
    if (statToday) {
      statToday.textContent = networkAvailable
        ? String(d.byType?.network ?? 0)
        : i18n('networkStatsUnavailable');
    }
    if (statNetwork) {
      statNetwork.textContent = networkAvailable
        ? String(d.byType?.network ?? 0)
        : i18n('networkStatsUnavailable');
    }
    if (statCosmetic) {
      statCosmetic.textContent = String(d.byType?.cosmetic ?? 0);
    }
    if (statYoutube) {
      statYoutube.textContent = String(d.byType?.youtube ?? 0);
    }
    const youtubeDetected = d.byType?.youtubeDetected ?? 0;
    const youtubeHidden = d.byType?.youtube ?? 0;
    if (statYoutubeDetected) {
      statYoutubeDetected.textContent = String(youtubeDetected);
    }
    if (statYoutubeUnhidden) {
      statYoutubeUnhidden.textContent = String(Math.max(0, youtubeDetected - youtubeHidden));
    }
  }

  // Chart: last 7 days
  if (chartCanvas && todayRes?.data?.networkStatsAvailable !== true) {
    const chartContainer = chartCanvas.closest('.chart-wrap');
    if (chartContainer) {
      chartContainer.textContent = i18n('networkStatsUnavailable');
      chartContainer.setAttribute('aria-label', i18n('networkStatsUnavailable'));
    } else {
      chartCanvas.hidden = true;
    }
  } else if (chartCanvas && rangeRes?.ok && Array.isArray(rangeRes.data)) {
    const labels = rangeRes.data.map((b) => b.date || '');
    const data = rangeRes.data.map((b) => b.total);
    renderDailyChart(chartCanvas, labels, data);
  } else if (chartCanvas) {
    const chartContainer = chartCanvas.closest('.chart-wrap');
    if (chartContainer) {
      chartContainer.textContent = i18n('networkStatsUnavailable');
      chartContainer.setAttribute('aria-label', i18n('networkStatsUnavailable'));
    } else {
      chartCanvas.hidden = true;
    }
  }

  // ---- T4.2: Top Domains ----
  const topDomainsContainer = document.getElementById('top-domains-container');
  const topRes = await sendMsg({ type: MSG.GET_TOP_DOMAINS, payload: {} });
  if (topRes?.ok && topRes.data) {
    if (topRes.data.available === true) {
      const domains = Array.isArray(topRes.data.topDomains)
        ? Object.fromEntries(topRes.data.topDomains.map(({ domain, count }) => [domain, count]))
        : topRes.data.topDomains;
      renderTopDomains(topDomainsContainer, domains);
    } else if (topDomainsContainer) {
      topDomainsContainer.textContent = i18n('networkStatsUnavailable');
    }
  } else {
    renderTopDomains(topDomainsContainer, {});
  }

  // ---- T4.3: Filter Lists ----
  const filterListsContainer = document.getElementById('filter-lists-container');
  const listUpdateBtn = document.getElementById('list-update-btn');
  const listUpdateStatus = document.getElementById('list-update-status');

  const handleListToggle = async (listId, enabled) => {
    const result = await sendMsg({ type: MSG.LIST_TOGGLE, payload: { listId, enabled } });
    if (!result?.ok) {
      const toggle = document.getElementById(`list-toggle-${listId}`);
      if (toggle) {
        toggle.checked = !enabled;
      }
      showStatus(listUpdateStatus, i18n('listUpdateError'), 'err');
      return;
    }
    const partial = result.data?.failedSources > 0;
    showStatus(
      listUpdateStatus,
      i18n(partial ? 'listUpdatePartial' : 'listUpdateSuccess'),
      partial ? 'err' : 'ok'
    );
  };

  // Fetch lists config from storage via SETTINGS_GET (lists config lives in settings)
  const settingsRes = await sendMsg({ type: MSG.SETTINGS_GET, payload: {} });
  if (settingsRes?.ok && settingsRes.data?.lists) {
    renderFilterLists(filterListsContainer, settingsRes.data.lists, handleListToggle);
  } else {
    // Show default lists placeholder
    renderFilterLists(
      filterListsContainer,
      {
        easylist: { name: 'EasyList', enabled: true },
        easyprivacy: { name: 'EasyPrivacy', enabled: true },
      },
      handleListToggle
    );
  }

  if (listUpdateBtn) {
    listUpdateBtn.addEventListener('click', async () => {
      listUpdateBtn.disabled = true;
      const res = await sendMsg({ type: MSG.LIST_UPDATE_NOW, payload: {} });
      listUpdateBtn.disabled = false;
      if (res?.ok) {
        const key = res.data?.failedSources ? 'listUpdatePartial' : 'listUpdateSuccess';
        showStatus(listUpdateStatus, i18n(key), res.data?.failedSources ? 'err' : 'ok');
      } else {
        showStatus(listUpdateStatus, i18n('listUpdateError'), 'err');
      }
    });
  }

  // ---- T4.4: Allowlist ----
  const allowlistForm = document.getElementById('allowlist-form');
  const allowlistInput = document.getElementById('allowlist-input');
  const allowlistError = document.getElementById('allowlist-error');
  const allowlistItems = document.getElementById('allowlist-items');

  let allowlist = [];

  const refreshAllowlist = async () => {
    const res = await sendMsg({ type: MSG.SETTINGS_GET, payload: {} });
    if (res?.ok && Array.isArray(res.data?.allowlist)) {
      allowlist = res.data.allowlist;
      renderAllowlist(allowlistItems, allowlist, handleRemove);
    }
  };

  const handleRemove = async (domain) => {
    const res = await sendMsg({ type: MSG.ALLOWLIST_REMOVE, payload: { domain } });
    if (res?.ok) {
      allowlist = allowlist.filter((d) => d !== domain);
      renderAllowlist(allowlistItems, allowlist, handleRemove);
    }
  };

  if (allowlistForm) {
    allowlistForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const domain = allowlistInput?.value?.trim()?.toLowerCase() || '';
      if (!isValidDomain(domain)) {
        if (allowlistError) {
          allowlistError.textContent = i18n('allowlistErrorInvalid');
        }
        return;
      }
      if (allowlistError) {
        allowlistError.textContent = '';
      }
      const res = await sendMsg({ type: MSG.ALLOWLIST_ADD, payload: { domain } });
      if (res?.ok) {
        if (!allowlist.includes(domain)) {
          allowlist.push(domain);
          renderAllowlist(allowlistItems, allowlist, handleRemove);
        }
        if (allowlistInput) {
          allowlistInput.value = '';
        }
      }
    });
  }

  await refreshAllowlist();

  // ---- T4.4: Custom Rules ----
  const customRulesTextarea = document.getElementById('custom-rules-textarea');
  const customRulesSaveBtn = document.getElementById('custom-rules-save-btn');
  const customRulesStatus = document.getElementById('custom-rules-status');

  // Load existing custom rules
  const customRulesRes = await sendMsg({ type: MSG.SETTINGS_GET, payload: {} });
  if (customRulesRes?.ok && customRulesTextarea) {
    const rules = customRulesRes.data?.customRules || [];
    customRulesTextarea.value = JSON.stringify(rules, null, 2);
  }

  if (customRulesSaveBtn && customRulesTextarea) {
    customRulesSaveBtn.addEventListener('click', async () => {
      const raw = customRulesTextarea.value.trim();
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        showStatus(customRulesStatus, i18n('customRulesErrorInvalid'), 'err');
        return;
      }
      if (!Array.isArray(parsed)) {
        showStatus(customRulesStatus, i18n('customRulesErrorInvalid'), 'err');
        return;
      }
      const res = await sendMsg({ type: MSG.CUSTOM_RULES_SET, payload: { rules: parsed } });
      if (res?.ok) {
        showStatus(customRulesStatus, i18n('customRulesSaved'), 'ok');
      } else {
        showStatus(
          customRulesStatus,
          res?.error?.message || i18n('customRulesErrorInvalid'),
          'err'
        );
      }
    });
  }

  // ---- T4.5: Data section ----
  const exportBtn = document.getElementById('export-stats-btn');
  const resetBtn = document.getElementById('reset-stats-btn');
  const dataStatus = document.getElementById('data-status');

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const res = await sendMsg({ type: MSG.STATS_EXPORT, payload: {} });
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
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      if (!window.confirm(i18n('resetConfirm'))) {
        return;
      }
      const res = await sendMsg({ type: MSG.STATS_RESET, payload: {} });
      if (res?.ok) {
        showStatus(dataStatus, i18n('resetSuccess'), 'ok');
        if (statLifetime) {
          statLifetime.textContent = '0';
        }
        if (statToday) {
          statToday.textContent = '0';
        }
        if (statNetwork) {
          statNetwork.textContent = '0';
        }
        if (statCosmetic) {
          statCosmetic.textContent = '0';
        }
        if (statYoutube) {
          statYoutube.textContent = '0';
        }
        if (statYoutubeDetected) {
          statYoutubeDetected.textContent = '0';
        }
        if (statYoutubeUnhidden) {
          statYoutubeUnhidden.textContent = '0';
        }
      }
    });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOptions);
  } else {
    initOptions();
  }
}
