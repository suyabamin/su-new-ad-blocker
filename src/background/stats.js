// src/background/stats.js
// Re-exports statistics tracker APIs from stats-tracker.js for backward compatibility.

export {
  getTodayString,
  initStats,
  recordBlockEvent,
  scheduleFlush,
  flushStats,
  getStatsSnapshot,
  resetInMemoryStats,
  setupDnrRuleMatchedListener,
  syncMatchedRules,
  updateTopDomains,
  MAX_TOP_DOMAINS,
} from './stats-tracker.js';
