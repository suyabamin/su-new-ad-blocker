import { test, expect } from './fixtures.js';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PAGE_PATH = path.resolve(__dirname, '../site/test-ad-page.html');

test.describe('Cosmetic Ad Element Hiding (E2E)', () => {
  test('content script injects stylesheet and hides ad elements on test page', async ({
    context,
  }) => {
    const page = await context.newPage();
    const testPageUrl = pathToFileURL(TEST_PAGE_PATH).href;

    await page.goto(testPageUrl);

    // Verify editorial content remains visible
    const articleTitle = page.locator('h1');
    await expect(articleTitle).toBeVisible();

    // Verify style tag was injected
    const styleElement = page.locator('#su-cosmetic-styles');
    await expect(styleElement).toHaveCount(1);

    // Verify ad containers are hidden via display: none
    const adBanner = page.locator('#ad-banner');
    await expect(adBanner).toBeHidden();

    const adContainer = page.locator('.ad-container');
    await expect(adContainer).toBeHidden();

    const sponsoredPost = page.locator('.sponsor-post');
    await expect(sponsoredPost).toBeHidden();
  });
});
