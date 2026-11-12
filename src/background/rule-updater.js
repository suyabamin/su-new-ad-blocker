// Downloads fixed filter-list data and atomically replaces this extension's dynamic rules.

import { logger } from '../shared/logger.js';
import {
  DYNAMIC_ALLOW_RULE_ID_OFFSET,
  DYNAMIC_RULE_ID_OFFSET,
  DYNAMIC_RULES_PER_LIST,
  FILTER_LISTS,
  MAX_DYNAMIC_FILTER_RULES,
  MAX_FILTER_LIST_BYTES,
} from '../shared/filter-lists.js';
import { compileFilterLists } from '../shared/filter-compiler.js';
import { STORAGE_KEYS } from '../shared/storage.js';

export const ALARM_NAME = 'FILTER_UPDATE';
export const ALARM_PERIOD_MINUTES = 24 * 60;
export const FIRST_MANAGED_RULE_ID = DYNAMIC_RULE_ID_OFFSET;
export const LAST_MANAGED_RULE_ID = DYNAMIC_RULE_ID_OFFSET + MAX_DYNAMIC_FILTER_RULES - 1;
export const FIRST_ALLOW_RULE_ID = DYNAMIC_ALLOW_RULE_ID_OFFSET;
export const LAST_ALLOW_RULE_ID = DYNAMIC_ALLOW_RULE_ID_OFFSET + MAX_DYNAMIC_FILTER_RULES - 1;
const FETCH_TIMEOUT_MS = 20_000;
const MIN_VALID_RULES_PER_LIST = 100;
let activeUpdate = null;

export function handleAlarm(alarm) {
  return alarm?.name === ALARM_NAME ? updateRules() : Promise.resolve({ ok: false, skipped: true });
}

export function setupRuleUpdaterAlarm() {
  if (!globalThis.chrome?.alarms?.create) {
    return;
  }
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: ALARM_PERIOD_MINUTES });
}

export function validateListUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && FILTER_LISTS.some((list) => list.url === url.href);
  } catch {
    return false;
  }
}

/** Checks size, origin, list identity, and useful parseable content before compilation. */
export function validateFilterList(list, response, text) {
  if (!response?.ok || !validateListUrl(response.url || list.url)) {
    throw new Error(`${list.id}: download failed or redirected to an untrusted URL`);
  }
  if (new TextEncoder().encode(text).byteLength > MAX_FILTER_LIST_BYTES) {
    throw new Error(`${list.id}: list exceeds the ${MAX_FILTER_LIST_BYTES}-byte limit`);
  }
  if (!text.includes('[') || !text.toLowerCase().includes(list.name.toLowerCase())) {
    throw new Error(`${list.id}: response does not identify itself as ${list.name}`);
  }
  const compiled = compileFilterLists([{ id: list.id, text }], { maxRules: 10_000 });
  if (compiled.rules.length < MIN_VALID_RULES_PER_LIST) {
    throw new Error(`${list.id}: only ${compiled.rules.length} supported rules found`);
  }
  return compiled.rules.length;
}

async function readLimitedResponse(response) {
  if (!response.body?.getReader) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_FILTER_LIST_BYTES) {
      throw new Error('Filter list response exceeds the size limit');
    }
    return text;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    bytes += value.byteLength;
    if (bytes > MAX_FILTER_LIST_BYTES) {
      await reader.cancel();
      throw new Error('Filter list response exceeds the size limit');
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function fetchFilterList(list) {
  if (!validateListUrl(list.url) || typeof fetch !== 'function') {
    throw new Error(`${list.id}: secure filter-list downloads are unavailable`);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(list.url, {
      method: 'GET',
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: controller.signal,
    });
    const contentLength = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_FILTER_LIST_BYTES) {
      throw new Error(`${list.id}: response exceeds the size limit`);
    }
    const text = await readLimitedResponse(response);
    validateFilterList(list, response, text);
    return { id: list.id, text };
  } finally {
    clearTimeout(timer);
  }
}

async function downloadEnabledLists() {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.lists);
  const enabled = stored[STORAGE_KEYS.lists] || {};
  const selected = FILTER_LISTS.filter((list) => enabled[list.id]?.enabled !== false);
  const results = await Promise.all(
    selected.map(async (list) => {
      try {
        return { id: list.id, source: await fetchFilterList(list) };
      } catch (error) {
        return { id: list.id, error };
      }
    })
  );
  const sources = results.filter((result) => result.source).map((result) => result.source);
  const errors = results.filter((result) => result.error);
  if (selected.length > 0 && sources.length === 0) {
    throw errors[0]?.error || new Error('No filter lists downloaded');
  }
  return { sources, errors, selected };
}

function sourceRuleRange(listId, isAllow = false) {
  const index = FILTER_LISTS.findIndex((list) => list.id === listId);
  if (index < 0) {
    return null;
  }
  const start = isAllow ? DYNAMIC_ALLOW_RULE_ID_OFFSET : DYNAMIC_RULE_ID_OFFSET;
  const first = start + index * DYNAMIC_RULES_PER_LIST;
  return { first, last: first + DYNAMIC_RULES_PER_LIST - 1 };
}

function compileSources(sources) {
  const rules = [];
  const report = [];
  const seen = new Set();
  for (const source of sources) {
    const index = FILTER_LISTS.findIndex((list) => list.id === source.id);
    const compiled = compileFilterLists([source], {
      maxRules: DYNAMIC_RULES_PER_LIST,
      firstId: 1,
    });
    let blockOffset = 0;
    let allowOffset = 0;
    for (const rule of compiled.rules) {
      const signature = JSON.stringify([rule.action, rule.condition]);
      if (seen.has(signature)) {
        continue;
      }
      seen.add(signature);
      if (rule.action.type === 'allow') {
        rule.id = DYNAMIC_ALLOW_RULE_ID_OFFSET + index * DYNAMIC_RULES_PER_LIST + allowOffset++;
      } else {
        rule.id = DYNAMIC_RULE_ID_OFFSET + index * DYNAMIC_RULES_PER_LIST + blockOffset++;
      }
      rules.push(rule);
    }
    report.push(...compiled.report);
  }
  return { rules, report };
}

/** Shares overlapping manual/alarm runs so they cannot replace each other's rule set. */
export function updateRules() {
  if (activeUpdate) {
    return activeUpdate;
  }
  activeUpdate = performUpdate().finally(() => {
    activeUpdate = null;
  });
  return activeUpdate;
}

/** Applies valid downloaded lists in one DNR update; failed validation leaves prior rules intact. */
async function performUpdate() {
  const dnr = globalThis.chrome?.declarativeNetRequest;
  const storage = globalThis.chrome?.storage?.local;
  if (!dnr?.getDynamicRules || !dnr?.updateDynamicRules || !storage) {
    return { ok: false, error: 'Dynamic rule updates are unavailable in this environment' };
  }

  try {
    const { sources, errors, selected } = await downloadEnabledLists();
    const { rules, report } = compileSources(sources);
    const currentRules = await dnr.getDynamicRules();
    const failedIds = new Set(errors.map((entry) => entry.id));
    const isManagedRule = (ruleId) =>
      (ruleId >= FIRST_MANAGED_RULE_ID && ruleId <= LAST_MANAGED_RULE_ID) ||
      (ruleId >= FIRST_ALLOW_RULE_ID && ruleId <= LAST_ALLOW_RULE_ID);
    const isForFailedSource = (ruleId) =>
      [...failedIds].some((listId) =>
        [sourceRuleRange(listId), sourceRuleRange(listId, true)].some(
          (range) => range && ruleId >= range.first && ruleId <= range.last
        )
      );
    const removeRuleIds = currentRules
      .filter((rule) => isManagedRule(rule.id) && !isForFailedSource(rule.id))
      .map((rule) => rule.id);
    await dnr.updateDynamicRules({ removeRuleIds, addRules: rules });
    const preservedCount = currentRules.filter(
      (rule) => isManagedRule(rule.id) && isForFailedSource(rule.id)
    ).length;
    const installedCount = preservedCount + rules.length;

    try {
      const key = STORAGE_KEYS['stats:meta'];
      const stored = await storage.get(key);
      const meta = stored[key] || {};
      await storage.set({
        [key]: {
          ...meta,
          lastRuleUpdate: new Date().toISOString(),
          filterUpdateRuleCount: installedCount,
          filterUpdateSources: selected.map((list) => list.id),
        },
      });
    } catch (err) {
      logger.error('RuleUpdater', 'Rules updated but metadata could not be saved:', err);
    }

    const result = { ok: true, count: installedCount, report, failedSources: errors.length };
    logger.info('RuleUpdater', `Installed ${installedCount} dynamic filter rules`);
    return result;
  } catch (err) {
    logger.error('RuleUpdater', 'Filter update failed; existing rules were kept:', err);
    return { ok: false, error: err.message };
  }
}
