// tests/perf/run.js
// Performance benchmark harness measuring cosmetic injection and rule parsing overhead.
// Task: T6.1

import { performance } from 'node:perf_hooks';
import { JSDOM } from 'jsdom';
import { buildCosmeticCss, injectCosmeticStyles } from '../../src/content/cosmetic.js';
import { GENERIC_SELECTORS } from '../../src/content/selectors.js';
import { buildYouTubeCss } from '../../src/content/youtube.js';
import { YOUTUBE_SELECTORS } from '../../src/content/youtube/selectors.js';

/**
 * Calculates median from an array of numbers.
 * @param {number[]} numbers
 * @returns {number}
 */
export function median(numbers) {
  if (!numbers || numbers.length === 0) {
    return 0;
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Runs performance benchmark iterations.
 * @param {number} [iterations=100]
 * @returns {{ medianCosmeticMs: number, medianYouTubeMs: number, passed: boolean }}
 */
export function runBenchmark(iterations = 100) {
  const cosmeticTimes = [];
  const youtubeTimes = [];

  for (let i = 0; i < iterations; i++) {
    const dom = new JSDOM(
      '<!doctype html><html><head></head><body><div class="ad-banner"></div></body></html>'
    );
    const doc = dom.window.document;

    // Benchmark cosmetic CSS injection
    const t0 = performance.now();
    buildCosmeticCss(GENERIC_SELECTORS);
    injectCosmeticStyles(doc, GENERIC_SELECTORS);
    const t1 = performance.now();
    cosmeticTimes.push(t1 - t0);

    // Benchmark YouTube CSS generation
    const t2 = performance.now();
    buildYouTubeCss(YOUTUBE_SELECTORS);
    const t3 = performance.now();
    youtubeTimes.push(t3 - t2);
  }

  const medianCosmeticMs = median(cosmeticTimes);
  const medianYouTubeMs = median(youtubeTimes);

  // Maximum allowed median latency: 5ms for cosmetic, 1ms for YouTube CSS
  const passed = medianCosmeticMs < 5 && medianYouTubeMs < 1;

  return {
    iterations,
    medianCosmeticMs: Number(medianCosmeticMs.toFixed(3)),
    medianYouTubeMs: Number(medianYouTubeMs.toFixed(3)),
    passed,
  };
}

// If run directly via node
if (process.argv[1] && process.argv[1].endsWith('run.js')) {
  console.log('Running performance benchmark harness...');
  const results = runBenchmark(100);
  console.log(`Iterations: ${results.iterations}`);
  console.log(`Median Cosmetic Injection: ${results.medianCosmeticMs} ms`);
  console.log(`Median YouTube CSS Build: ${results.medianYouTubeMs} ms`);

  if (!results.passed) {
    console.error('Benchmark failed: median added time exceeds budget.');
    process.exit(1);
  }
  console.log('Performance benchmark PASSED.');
  process.exit(0);
}
