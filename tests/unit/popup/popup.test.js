// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isRestrictedUrl,
  updatePauseButton,
  initPopup,
  UI_STRINGS,
  formatNetworkCount,
} from '../../../src/popup/popup.js';
import { MSG } from '../../../src/shared/messages.js';

describe('popup module (src/popup/popup.js)', () => {
  it('does not display a fabricated network count when diagnostics are unavailable', () => {
    expect(formatNetworkCount(false, 900)).toBe(UI_STRINGS.NETWORK_UNAVAILABLE);
    expect(formatNetworkCount(true, 0)).toBe('0');
  });

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="status-container" hidden></div>
      <span id="current-site-display">Loading...</span>
      <button id="pause-site-button" aria-checked="false"><span class="btn-text">Pause on this site</span></button>
      <span id="tab-blocked-count">0</span>
      <span id="today-blocked-count">0</span>
      <strong id="count-network">0</strong>
      <strong id="count-cosmetic">0</strong>
      <strong id="count-youtube">0</strong>
      <button id="open-options-button">Options</button>
    `;

    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
        openOptionsPage: vi.fn(),
      },
      tabs: {
        query: vi.fn((_query, cb) => {
          if (cb) {
            cb([]);
          }
        }),
      },
    };
  });

  describe('isRestrictedUrl', () => {
    it('returns true for browser internal URLs', () => {
      expect(isRestrictedUrl('chrome://extensions')).toBe(true);
      expect(isRestrictedUrl('chrome-extension://abcd/popup.html')).toBe(true);
      expect(isRestrictedUrl('edge://settings')).toBe(true);
      expect(isRestrictedUrl('about:blank')).toBe(true);
      expect(isRestrictedUrl('devtools://devtools/bundled/')).toBe(true);
      expect(isRestrictedUrl('')).toBe(true);
      expect(isRestrictedUrl(null)).toBe(true);
    });

    it('returns false for standard web URLs', () => {
      expect(isRestrictedUrl('https://example.com')).toBe(false);
      expect(isRestrictedUrl('http://localhost:3000')).toBe(false);
    });
  });

  describe('updatePauseButton', () => {
    it('toggles aria-checked attribute and updates button text', () => {
      const button = document.getElementById('pause-site-button');

      updatePauseButton(button, true);
      expect(button.getAttribute('aria-checked')).toBe('true');
      expect(button.querySelector('.btn-text').textContent).toBe(UI_STRINGS.PAUSE_BUTTON_ACTIVE);

      updatePauseButton(button, false);
      expect(button.getAttribute('aria-checked')).toBe('false');
      expect(button.querySelector('.btn-text').textContent).toBe(UI_STRINGS.PAUSE_BUTTON_INACTIVE);
    });
  });

  describe('initPopup', () => {
    it('populates stats and sets hostname for active web tab', async () => {
      globalThis.chrome.tabs.query.mockImplementation((_query, cb) => {
        cb([{ url: 'https://news.ycombinator.com/item?id=1' }]);
      });

      globalThis.chrome.runtime.sendMessage.mockImplementation((msg, cb) => {
        if (msg.type === MSG.GET_TAB_STATS) {
          cb({
            ok: true,
            data: { count: 7, hostname: 'news.ycombinator.com', available: true },
          });
        } else if (msg.type === MSG.GET_TODAY_SUMMARY) {
          cb({
            ok: true,
            data: {
              todayBlocked: 42,
              networkStatsAvailable: true,
              byType: { network: 30, cosmetic: 10, youtube: 2 },
            },
          });
        }
      });

      await initPopup();

      expect(document.getElementById('current-site-display').textContent).toBe(
        'news.ycombinator.com'
      );
      expect(document.getElementById('tab-blocked-count').textContent).toBe('7');
      expect(document.getElementById('today-blocked-count').textContent).toBe('42');
      expect(document.getElementById('count-network').textContent).toBe('30');
      expect(document.getElementById('count-cosmetic').textContent).toBe('10');
      expect(document.getElementById('count-youtube').textContent).toBe('2');
    });

    it('shows restricted notice and disables pause button for restricted pages', async () => {
      globalThis.chrome.tabs.query.mockImplementation((_query, cb) => {
        cb([{ url: 'chrome://settings' }]);
      });

      await initPopup();

      expect(document.getElementById('current-site-display').textContent).toBe(
        UI_STRINGS.RESTRICTED_PAGE
      );
      const statusBox = document.getElementById('status-container');
      expect(statusBox.textContent).toBe(UI_STRINGS.RESTRICTED_MESSAGE);
      expect(statusBox.hasAttribute('hidden')).toBe(false);
      expect(document.getElementById('pause-site-button').hasAttribute('disabled')).toBe(true);
    });

    it('opens options page on clicking open options button', async () => {
      await initPopup();
      document.getElementById('open-options-button').click();
      expect(globalThis.chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });
});
