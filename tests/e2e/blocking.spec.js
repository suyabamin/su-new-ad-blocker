import { test, expect } from './fixtures.js';
import path from 'path';
import { fileURLToPath } from 'url';

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../site/test-ad-page.html'
);

test.describe('Extension Loading and UI (E2E)', () => {
  test('extension loads with valid service worker and opens popup without errors', async ({
    context,
    extensionId,
  }) => {
    expect(extensionId).toBeTruthy();

    const popupPage = await context.newPage();
    const consoleErrors = [];
    popupPage.on('pageerror', (err) => consoleErrors.push(err.message));

    await popupPage.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);

    // Ensure header title is present
    const headerTitle = popupPage.locator('.popup-title');
    await expect(headerTitle).toHaveText('SU New Ad Blocker');

    // Ensure pause button is rendered
    const pauseButton = popupPage.locator('#pause-site-button');
    await expect(pauseButton).toBeVisible();

    // Verify no unhandled exceptions in popup
    expect(consoleErrors).toHaveLength(0);
  });

  test('options dashboard page renders without errors', async ({ context, extensionId }) => {
    const optionsPage = await context.newPage();
    const consoleErrors = [];
    optionsPage.on('pageerror', (err) => consoleErrors.push(err.message));

    await optionsPage.goto(`chrome-extension://${extensionId}/src/options/options.html`);

    // Ensure dashboard title is present
    const title = optionsPage.locator('h1');
    await expect(title).toHaveText('SU New Ad Blocker — Dashboard & Settings');

    // Ensure allowlist input is present
    const domainInput = optionsPage.locator('#allowlist-input');
    await expect(domainInput).toBeVisible();

    // Verify no unhandled exceptions
    expect(consoleErrors).toHaveLength(0);
  });

  test('declarativeNetRequest static ruleset blocks requests to known ad domains', async ({
    context,
  }) => {
    const page = await context.newPage();

    let requestFailed = false;
    page.on('requestfailed', (req) => {
      if (req.url().includes('doubleclick.net') || req.url().includes('ads.test.local')) {
        requestFailed = true;
      }
    });

    const outcome = await page.evaluate(async () => {
      try {
        await fetch('https://doubleclick.net/pagead/ads.js', { mode: 'no-cors' });
        return 'loaded';
      } catch {
        return 'blocked';
      }
    });

    expect(outcome).toBe('blocked');
    expect(requestFailed).toBe(true);
  });

  test('popup reports ten blocked fixture requests without double counting', async ({
    context,
    extensionId,
  }) => {
    const page = await context.newPage();
    await page.route('http://site.test.local/**', (route) => route.fulfill({ path: fixturePath }));
    await page.goto('http://site.test.local/');
    await page.evaluate(() => window.fixtureAdRequests);

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/popup.html`);
    await expect(popup.locator('#today-blocked-count')).toHaveText('10');
  });
});
