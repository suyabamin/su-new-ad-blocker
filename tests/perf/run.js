import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as prettier from 'prettier';
import { buildExtension } from '../../scripts/build.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SITE_DIR = path.join(ROOT_DIR, 'tests', 'site');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_PATH = path.join(ROOT_DIR, 'tests', 'perf', 'results.json');
const RUNS_PER_MODE = 10;
const RULESET_ID = 'main_blocking_rules';

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function rounded(value) {
  return Math.round(value * 100) / 100;
}

function listSitePages() {
  return fs
    .readdirSync(SITE_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map((entry) => entry.name)
    .sort();
}

function createSiteServer() {
  return http.createServer((request, response) => {
    const pageName = path.basename(new URL(request.url, 'http://127.0.0.1').pathname);
    const pagePath = path.join(SITE_DIR, pageName);
    if (!pageName || !fs.existsSync(pagePath) || !pagePath.startsWith(`${SITE_DIR}${path.sep}`)) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    fs.createReadStream(pagePath).pipe(response);
  });
}

async function setBlocking(worker, enabled) {
  await worker.evaluate(
    async ({ rulesetId, isEnabled }) => {
      await globalThis.chrome.declarativeNetRequest.updateEnabledRulesets({
        enableRulesetIds: isEnabled ? [rulesetId] : [],
        disableRulesetIds: isEnabled ? [] : [rulesetId],
      });
    },
    { rulesetId: RULESET_ID, isEnabled: enabled }
  );
}

async function measureNavigation(context, url) {
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForFunction(
      () => performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0,
      null,
      { timeout: 5000 }
    );
    return await page.evaluate(() => performance.getEntriesByType('navigation')[0].loadEventEnd);
  } finally {
    await page.close();
  }
}

async function runMeasurements(pages, context, worker, baseUrl) {
  const pageResults = {};
  for (const pageName of pages) {
    const url = `${baseUrl}/${encodeURIComponent(pageName)}`;
    const on = [];
    const off = [];
    const pairedAdded = [];

    for (let run = 0; run < RUNS_PER_MODE; run++) {
      const order = run % 2 === 0 ? [true, false] : [false, true];
      const pair = {};
      for (const enabled of order) {
        await setBlocking(worker, enabled);
        pair[enabled ? 'on' : 'off'] = rounded(await measureNavigation(context, url));
        (enabled ? on : off).push(pair[enabled ? 'on' : 'off']);
      }
      pairedAdded.push(pair.on - pair.off);
    }

    pageResults[pageName] = {
      runCountPerMode: RUNS_PER_MODE,
      blockingOnMs: on,
      blockingOffMs: off,
      medianBlockingOnMs: rounded(median(on)),
      medianBlockingOffMs: rounded(median(off)),
      medianAddedLoadMs: rounded(median(pairedAdded)),
    };
  }
  return pageResults;
}

async function startServer(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server.address().port;
}

async function closeServer(server) {
  if (server?.listening) {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
}

async function run() {
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= 'D:\\.playwright-browsers';
  const { chromium } = await import('@playwright/test');
  const pages = listSitePages();
  if (pages.length === 0) {
    throw new Error(`No HTML pages found in ${SITE_DIR}`);
  }

  await buildExtension({ rootDir: ROOT_DIR, outDir: DIST_DIR });
  const server = createSiteServer();
  const port = await startServer(server);
  const profileParent = path.join(ROOT_DIR, '.pw-tmp');
  fs.mkdirSync(profileParent, { recursive: true });
  const profile = fs.mkdtempSync(path.join(profileParent, 'perf-run-'));
  let context;

  try {
    context = await chromium.launchPersistentContext(profile, {
      channel: 'chromium',
      headless: false,
      ignoreDefaultArgs: ['--disable-extensions'],
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        `--disable-extensions-except=${DIST_DIR}`,
        `--load-extension=${DIST_DIR}`,
      ],
    });
    let [worker] = context.serviceWorkers();
    if (!worker) {
      worker = await context.waitForEvent('serviceworker', { timeout: 30_000 });
    }

    const results = await runMeasurements(pages, context, worker, `http://127.0.0.1:${port}`);
    const output = {
      generatedAt: new Date().toISOString(),
      browser: 'Chromium',
      extension: 'unpacked dist/',
      comparison:
        'Static DNR ruleset on versus off; cosmetic scripts remain enabled in both modes.',
      runsPerModePerPage: RUNS_PER_MODE,
      pages: results,
    };
    const prettierOptions = await prettier.resolveConfig(OUTPUT_PATH);
    const formatted = await prettier.format(JSON.stringify(output), {
      ...prettierOptions,
      parser: 'json',
    });
    fs.writeFileSync(OUTPUT_PATH, formatted, 'utf8');
    process.stdout.write(`Performance results written to ${OUTPUT_PATH}\n`);
    for (const [pageName, result] of Object.entries(results)) {
      process.stdout.write(
        `${pageName}: on median ${result.medianBlockingOnMs} ms, ` +
          `off median ${result.medianBlockingOffMs} ms, ` +
          `added median ${result.medianAddedLoadMs} ms (${RUNS_PER_MODE} runs per mode)\n`
      );
    }
  } finally {
    await context?.close();
    await closeServer(server);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}

run().catch((error) => {
  process.stderr.write(`Performance run failed: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
