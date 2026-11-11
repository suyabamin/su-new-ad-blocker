import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildRules,
  buildDnrRulesFromDomains,
  extractDomainsFromFilterList,
  CANONICAL_DOMAINS,
} from '../../../scripts/build-rules.js';

describe('build-rules script (scripts/build-rules.js)', () => {
  const tempOutputPath = path.resolve(__dirname, 'temp_test_rules.json');

  afterEach(() => {
    if (fs.existsSync(tempOutputPath)) {
      fs.unlinkSync(tempOutputPath);
    }
  });

  it('buildDnrRulesFromDomains generates valid DNR rule structure (AC-TD.1-3)', () => {
    const domains = ['doubleclick.net', 'example-tracker.com'];
    const rules = buildDnrRulesFromDomains(domains, 100);

    expect(rules).toHaveLength(2);
    expect(rules[0]).toEqual({
      id: 100,
      priority: 1,
      action: { type: 'block' },
      condition: {
        urlFilter: '||doubleclick.net^',
        resourceTypes: [
          'main_frame',
          'sub_frame',
          'stylesheet',
          'script',
          'image',
          'font',
          'object',
          'xmlhttprequest',
          'ping',
          'media',
          'websocket',
          'other',
        ],
      },
    });
  });

  it('extractDomainsFromFilterList extracts ||domain^ patterns correctly', () => {
    const sample = `
! Title: EasyList
! Description: An adblock filter list
||doubleclick.net^
||googlesyndication.com^$script
[Adblock Plus 2.0]
# Comment line
||adservice.google.com^
`;
    const domains = extractDomainsFromFilterList(sample);
    expect(domains).toContain('doubleclick.net');
    expect(domains).toContain('googlesyndication.com');
    expect(domains).toContain('adservice.google.com');
  });

  it('buildRules writes valid JSON array with >= 500 rules (AC-TD.1-1, AC-TD.1-2)', async () => {
    const count = await buildRules(tempOutputPath);
    expect(count).toBeGreaterThanOrEqual(500);

    const content = fs.readFileSync(tempOutputPath, 'utf8');
    const rules = JSON.parse(content);

    expect(Array.isArray(rules)).toBe(true);
    expect(rules.length).toBeGreaterThanOrEqual(500);

    // Validate fields on every rule (AC-TD.1-3)
    for (const rule of rules) {
      expect(rule).toHaveProperty('id');
      expect(typeof rule.id).toBe('number');
      expect(rule).toHaveProperty('priority');
      expect(typeof rule.priority).toBe('number');
      expect(rule).toHaveProperty('action');
      expect(rule.action).toHaveProperty('type', 'block');
      expect(rule).toHaveProperty('condition');
      expect(rule.condition).toHaveProperty('urlFilter');
      expect(rule.condition).toHaveProperty('resourceTypes');
    }
  });

  it('rules include all 10 canonical ad-network domains (AC-TD.1-4)', async () => {
    await buildRules(tempOutputPath);
    const content = fs.readFileSync(tempOutputPath, 'utf8');
    const rules = JSON.parse(content);

    const urlFilters = rules.map((r) => r.condition.urlFilter);

    for (const domain of CANONICAL_DOMAINS) {
      const expectedFilter = `||${domain}^`;
      expect(urlFilters).toContain(expectedFilter);
    }
  });
});
