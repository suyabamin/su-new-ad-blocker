// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  i18n,
  isValidDomain,
  renderAllowlist,
  lastNDays,
  renderDailyChart,
  renderTopDomains,
  renderFilterLists,
  initOptions,
  _resetDailyChart,
} from '../../../src/options/options.js';
import { MSG } from '../../../src/shared/messages.js';

describe('options dashboard (src/options/options.js)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    _resetDailyChart();

    globalThis.chrome = {
      i18n: {
        getMessage: vi.fn((key) => `[msg:${key}]`),
      },
      runtime: {
        sendMessage: vi.fn((msg, cb) => {
          if (cb) {
            cb({ ok: true, data: {} });
          }
        }),
      },
    };
  });

  afterEach(() => {
    delete globalThis.chrome;
    delete globalThis.Chart;
  });

  describe('i18n helper (T4.6)', () => {
    it('retrieves localized string from chrome.i18n', () => {
      expect(i18n('optionsTitle')).toBe('[msg:optionsTitle]');
      expect(globalThis.chrome.i18n.getMessage).toHaveBeenCalledWith('optionsTitle');
    });

    it('falls back to key when chrome.i18n is unavailable', () => {
      delete globalThis.chrome;
      expect(i18n('anyKey')).toBe('anyKey');
    });
  });

  describe('isValidDomain (T4.4)', () => {
    it('accepts valid domains', () => {
      expect(isValidDomain('example.com')).toBe(true);
      expect(isValidDomain('sub.domain.co.uk')).toBe(true);
      expect(isValidDomain('my-site.org')).toBe(true);
      expect(isValidDomain('test123.net')).toBe(true);
    });

    it('rejects invalid domains', () => {
      expect(isValidDomain('')).toBe(false);
      expect(isValidDomain(null)).toBe(false);
      expect(isValidDomain(undefined)).toBe(false);
      expect(isValidDomain(123)).toBe(false);
      expect(isValidDomain('-invalid.com')).toBe(false);
      expect(isValidDomain('no_tld')).toBe(false);
      expect(isValidDomain('has spaces.com')).toBe(false);
      expect(isValidDomain('https://example.com')).toBe(false);
    });
  });

  describe('renderAllowlist (T4.4)', () => {
    it('renders allowlist items with accessible remove buttons', () => {
      const ul = document.createElement('ul');
      const onRemove = vi.fn();

      renderAllowlist(ul, ['alpha.com', 'beta.org'], onRemove);

      const items = ul.querySelectorAll('li');
      expect(items.length).toBe(2);
      expect(items[0].textContent).toContain('alpha.com');
      expect(items[1].textContent).toContain('beta.org');

      const btn = items[0].querySelector('button');
      expect(btn).not.toBeNull();
      btn.click();
      expect(onRemove).toHaveBeenCalledWith('alpha.com');
    });

    it('handles empty allowlist and null container gracefully', () => {
      const ul = document.createElement('ul');
      renderAllowlist(ul, [], vi.fn());
      expect(ul.children.length).toBe(0);
      expect(() => renderAllowlist(null, ['test.com'], vi.fn())).not.toThrow();
    });
  });

  describe('lastNDays (T4.1)', () => {
    it('generates an array of N date strings in YYYY-MM-DD format', () => {
      const days = lastNDays(7);
      expect(days.length).toBe(7);
      for (const d of days) {
        expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });
  });

  describe('renderDailyChart (T4.1)', () => {
    it('initializes Chart constructor when canvas and globalThis.Chart are available', () => {
      const mockDestroy = vi.fn();
      const mockChartInstance = { destroy: mockDestroy };
      const mockChartConstructor = vi.fn(function () {
        return mockChartInstance;
      });
      globalThis.Chart = mockChartConstructor;

      const canvas = document.createElement('canvas');
      const chart = renderDailyChart(canvas, ['2026-11-10', '2026-11-11'], [10, 20]);

      expect(mockChartConstructor).toHaveBeenCalledTimes(1);
      expect(chart).toBe(mockChartInstance);

      // Subsequent call destroys previous instance
      renderDailyChart(canvas, ['2026-11-12'], [30]);
      expect(mockDestroy).toHaveBeenCalledTimes(1);
    });

    it('returns null if canvas or globalThis.Chart is missing', () => {
      expect(renderDailyChart(null, [], [])).toBeNull();
      delete globalThis.Chart;
      const canvas = document.createElement('canvas');
      expect(renderDailyChart(canvas, [], [])).toBeNull();
    });
  });

  describe('renderTopDomains (T4.2)', () => {
    it('renders sortable top domains table with accessible columns', () => {
      const container = document.createElement('div');
      const topDomains = {
        'ads.tracker.com': 50,
        'analytics.net': 120,
      };

      renderTopDomains(container, topDomains);

      const table = container.querySelector('table');
      expect(table).not.toBeNull();
      const rows = container.querySelectorAll('tbody tr');
      expect(rows.length).toBe(2);

      // Default sort is count descending
      expect(rows[0].textContent).toContain('analytics.net');
      expect(rows[0].textContent).toContain('120');
      expect(rows[1].textContent).toContain('ads.tracker.com');
      expect(rows[1].textContent).toContain('50');

      // Sort button toggles sort order
      const sortCountBtn = container.querySelectorAll('thead button')[1];
      sortCountBtn.click(); // toggle to asc

      const sortedRows = container.querySelectorAll('tbody tr');
      expect(sortedRows[0].textContent).toContain('ads.tracker.com');
      expect(sortedRows[1].textContent).toContain('analytics.net');
    });

    it('renders empty fallback when topDomains is empty', () => {
      const container = document.createElement('div');
      renderTopDomains(container, {});
      expect(container.textContent).toContain('—');
    });
  });

  describe('renderFilterLists (T4.3)', () => {
    it('renders list toggle checkboxes and invokes onToggle', () => {
      const container = document.createElement('div');
      const lists = {
        easylist: { name: 'EasyList', enabled: true },
        easyprivacy: { name: 'EasyPrivacy', enabled: false },
      };
      const onToggle = vi.fn();

      renderFilterLists(container, lists, onToggle);

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(2);
      expect(checkboxes[0].checked).toBe(true);
      expect(checkboxes[1].checked).toBe(false);

      checkboxes[0].checked = false;
      checkboxes[0].dispatchEvent(new Event('change'));
      expect(onToggle).toHaveBeenCalledWith('easylist', false);
    });

    it('handles null container and empty lists safely', () => {
      expect(() => renderFilterLists(null, {}, vi.fn())).not.toThrow();
      const container = document.createElement('div');
      renderFilterLists(container, {}, vi.fn());
      expect(container.textContent).toContain('—');
    });
  });

  describe('initOptions integration (T4.1–T4.5)', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <title>Old Title</title>
        <span data-i18n="optionsTitle"></span>
        <span id="stat-lifetime">0</span>
        <span id="stat-today">0</span>
        <span id="stat-network">0</span>
        <span id="stat-cosmetic">0</span>
        <span id="stat-youtube">0</span>
        <span id="stat-youtube-detected">0</span>
        <span id="stat-youtube-unhidden">0</span>
        <canvas id="daily-chart"></canvas>
        <div id="top-domains-container"></div>
        <div id="filter-lists-container"></div>
        <button id="list-update-btn"></button>
        <div id="list-update-status"></div>
        <form id="allowlist-form">
          <input id="allowlist-input" value="" />
          <button type="submit" id="allowlist-add-btn"></button>
        </form>
        <div id="allowlist-error"></div>
        <ul id="allowlist-items"></ul>
        <textarea id="custom-rules-textarea"></textarea>
        <button id="custom-rules-save-btn"></button>
        <div id="custom-rules-status"></div>
        <button id="export-stats-btn"></button>
        <button id="reset-stats-btn"></button>
        <div id="data-status"></div>
      `;
    });

    it('populates overview stats and allowlist on init', async () => {
      globalThis.chrome.runtime.sendMessage = vi.fn((msg, cb) => {
        if (!cb) {
          return;
        }
        if (msg.type === MSG.GET_TAB_STATS) {
          cb({
            ok: true,
            data: { lifetime: { total: 450, byType: { network: 450 } }, available: true },
          });
        } else if (msg.type === MSG.GET_TODAY_SUMMARY) {
          cb({
            ok: true,
            data: {
              totalBlocked: 42,
              networkStatsAvailable: true,
              byType: { network: 30, cosmetic: 10, youtube: 2, youtubeDetected: 5 },
            },
          });
        } else if (msg.type === MSG.GET_STATS_RANGE) {
          cb({
            ok: true,
            data: [{ date: '2026-11-12', total: 42 }],
          });
        } else if (msg.type === MSG.GET_TOP_DOMAINS) {
          cb({
            ok: true,
            data: { topDomains: [{ domain: 'doubleclick.net', count: 25 }], available: true },
          });
        } else if (msg.type === MSG.SETTINGS_GET) {
          cb({
            ok: true,
            data: {
              allowlist: ['safe.org'],
              customRules: [{ id: 1 }],
            },
          });
        } else {
          cb({ ok: true, data: {} });
        }
      });

      await initOptions();

      expect(document.getElementById('stat-lifetime').textContent).toBe('450');
      expect(document.getElementById('stat-today').textContent).toBe('30');
      expect(document.getElementById('stat-network').textContent).toBe('30');
      expect(document.getElementById('stat-cosmetic').textContent).toBe('10');
      expect(document.getElementById('stat-youtube').textContent).toBe('2');
      expect(document.getElementById('stat-youtube-detected').textContent).toBe('5');
      expect(document.getElementById('stat-youtube-unhidden').textContent).toBe('3');

      const allowlistItems = document.querySelectorAll('#allowlist-items li');
      expect(allowlistItems.length).toBe(1);
      expect(allowlistItems[0].textContent).toContain('safe.org');
    });

    it('validates allowlist form submission', async () => {
      await initOptions();

      const input = document.getElementById('allowlist-input');
      const form = document.getElementById('allowlist-form');
      const err = document.getElementById('allowlist-error');

      // Invalid input
      input.value = 'invalid domain!';
      form.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(err.textContent).toBe('[msg:allowlistErrorInvalid]');
    });

    it('validates custom rules JSON input', async () => {
      await initOptions();

      const textarea = document.getElementById('custom-rules-textarea');
      const saveBtn = document.getElementById('custom-rules-save-btn');
      const status = document.getElementById('custom-rules-status');

      textarea.value = '{ not an array }';
      saveBtn.click();

      expect(status.textContent).toBe('[msg:customRulesErrorInvalid]');
    });
  });
});
