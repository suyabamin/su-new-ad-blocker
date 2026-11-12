import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  buildRules,
  buildDnrRulesFromDomains,
  extractDomainsFromFilterList,
  parseEasyListRule,
  CANONICAL_DOMAINS,
} from '../../../scripts/build-rules.js';

describe('build-rules script (scripts/build-rules.js)', () => {
  const tempPaths = [];

  function makeTempPath() {
    const p = path.join(
      os.tmpdir(),
      `test_rules_${Date.now()}_${Math.random().toString(36).slice(2)}.json`
    );
    tempPaths.push(p);
    return p;
  }

  afterEach(() => {
    for (const p of tempPaths.splice(0)) {
      try {
        if (fs.existsSync(p)) {
          fs.unlinkSync(p);
        }
      } catch {
        // Windows may still have the file open briefly; ignore
      }
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
    const tempOutputPath = makeTempPath();
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
      expect(['block', 'allow']).toContain(rule.action.type);
      expect(rule).toHaveProperty('condition');
      expect(rule.condition).toHaveProperty('urlFilter');
      expect(rule.condition).toHaveProperty('resourceTypes');
    }
  });

  it('rules include all 10 canonical ad-network domains (AC-TD.1-4)', async () => {
    const tempOutputPath = makeTempPath();
    await buildRules(tempOutputPath);
    const content = fs.readFileSync(tempOutputPath, 'utf8');
    const rules = JSON.parse(content);

    const urlFilters = rules.map((r) => r.condition.urlFilter);

    for (const domain of CANONICAL_DOMAINS) {
      const expectedFilter = `||${domain}^`;
      expect(urlFilters).toContain(expectedFilter);
    }
  });

  describe('parseEasyListRule line parser', () => {
    it('parses basic block rule into DNR descriptor', () => {
      const parsed = parseEasyListRule('||ads.example.com^');
      expect(parsed).toEqual({
        action: 'block',
        urlFilter: '||ads.example.com^',
        resourceTypes: null,
        domainType: null,
        initiatorDomains: null,
      });
    });

    it('parses allow/exception rule (@@) into DNR allow descriptor', () => {
      const parsed = parseEasyListRule('@@||whitelisted.example.com^');
      expect(parsed).toEqual({
        action: 'allow',
        urlFilter: '||whitelisted.example.com^',
        resourceTypes: null,
        domainType: null,
        initiatorDomains: null,
      });
    });

    it('parses $third-party modifier correctly', () => {
      const parsed = parseEasyListRule('||tracker.example.com^$third-party');
      expect(parsed).toEqual({
        action: 'block',
        urlFilter: '||tracker.example.com^',
        resourceTypes: null,
        domainType: 'thirdParty',
        initiatorDomains: null,
      });
    });

    it('parses $domain= modifier correctly', () => {
      const parsed = parseEasyListRule('||ad.example.com^$domain=example.com');
      expect(parsed).toEqual({
        action: 'block',
        urlFilter: '||ad.example.com^',
        resourceTypes: null,
        domainType: null,
        initiatorDomains: ['example.com'],
      });
    });

    it('parses resource type modifiers ($script,image) correctly', () => {
      const parsed = parseEasyListRule('||adservice.example.com^$script,image');
      expect(parsed).toEqual({
        action: 'block',
        urlFilter: '||adservice.example.com^',
        resourceTypes: ['script', 'image'],
        domainType: null,
        initiatorDomains: null,
      });
    });

    it('returns null for cosmetic element-hiding rules', () => {
      expect(parseEasyListRule('##.ad-banner')).toBeNull();
      expect(parseEasyListRule('example.com##.sponsor')).toBeNull();
      expect(parseEasyListRule('example.com#@#.false-positive')).toBeNull();
    });

    it('returns null for comments and metadata headers', () => {
      expect(parseEasyListRule('! Title: EasyList')).toBeNull();
      expect(parseEasyListRule('[Adblock Plus 2.0]')).toBeNull();
      expect(parseEasyListRule('')).toBeNull();
      expect(parseEasyListRule('   ')).toBeNull();
    });

    it('returns null for unsupported modifiers', () => {
      expect(parseEasyListRule('||example.com^$popup')).toBeNull();
      expect(parseEasyListRule('||example.com^$badfilter')).toBeNull();
      expect(parseEasyListRule('||example.com^$elemhide')).toBeNull();
    });
  });

  describe('DNR build output and static limits', () => {
    it('sets allow rules priority (2) > block rules priority (1)', async () => {
      const tempOutputPath = makeTempPath();
      await buildRules(tempOutputPath);
      const content = fs.readFileSync(tempOutputPath, 'utf8');
      const rules = JSON.parse(content);

      const allowRules = rules.filter((r) => r.action.type === 'allow');
      const blockRules = rules.filter((r) => r.action.type === 'block');

      expect(allowRules.length).toBeGreaterThan(0);
      expect(blockRules.length).toBeGreaterThan(0);

      for (const allow of allowRules) {
        expect(allow.priority).toBe(2);
      }
      for (const block of blockRules) {
        expect(block.priority).toBe(1);
      }
    });

    it('generates build/report.json with summary counts', async () => {
      const tempOutputPath = makeTempPath();
      await buildRules(tempOutputPath);

      const reportPath = path.resolve(__dirname, '../../../build/report.json');
      expect(fs.existsSync(reportPath)).toBe(true);

      const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      expect(report).toHaveProperty('listFiles');
      expect(Array.isArray(report.listFiles)).toBe(true);
      expect(report).toHaveProperty('totalDnr');
      expect(typeof report.totalDnr).toBe('number');
      expect(report.totalDnr).toBeGreaterThanOrEqual(500);
      expect(report).toHaveProperty('totalCosmetic');
      expect(report).toHaveProperty('totalSkipped');
    });
  });
});
