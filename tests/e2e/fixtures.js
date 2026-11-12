import { test as base, chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = fs.existsSync(path.resolve(__dirname, '../../dist/manifest.json'))
  ? path.resolve(__dirname, '../../dist')
  : path.resolve(__dirname, '../../');

export const test = base.extend({
  context: async ({ headless: _headless }, use) => {
    const tmpBase = path.resolve(__dirname, '../../.pw-tmp');
    fs.mkdirSync(tmpBase, { recursive: true });
    const userDataDir = fs.mkdtempSync(path.join(tmpBase, 'pw-ext-'));
    // ignoreDefaultArgs removes Playwright's --disable-extensions which conflicts with --load-extension
    const context = await chromium.launchPersistentContext(userDataDir, {
      channel: 'chromium',
      headless: false,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--allow-file-access-from-files',
      ],
    });
    await use(context);
    await context.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker', { timeout: 30000 });
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export const expect = test.expect;
