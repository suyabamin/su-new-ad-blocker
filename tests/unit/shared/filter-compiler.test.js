import { describe, expect, it } from 'vitest';
import { compileFilterLists, parseNetworkFilter } from '../../../src/shared/filter-compiler.js';

describe('EasyList DNR compiler', () => {
  it('converts resource types, party and domain restrictions', () => {
    expect(
      parseNetworkFilter('||ads.example^$script,third-party,domain=site.example|~safe.example')
    ).toEqual({
      action: 'block',
      condition: {
        urlFilter: '||ads.example^',
        resourceTypes: ['script'],
        domainType: 'thirdParty',
        initiatorDomains: ['site.example'],
        excludedInitiatorDomains: ['safe.example'],
      },
      important: false,
    });
    expect(parseNetworkFilter('||ads.example^$~image')?.condition.excludedResourceTypes).toEqual([
      'image',
    ]);
    expect(parseNetworkFilter('||ads.example^$script')).toMatchObject({
      condition: { resourceTypes: ['script'] },
    });
  });

  it('preserves URL anchors and converts exceptions to higher-priority allow rules', () => {
    const result = parseNetworkFilter('@@|https://example.com/allowed.js|$script,match-case');
    expect(result).toEqual({
      action: 'allow',
      condition: {
        urlFilter: '|https://example.com/allowed.js|',
        resourceTypes: ['script'],
        isUrlFilterCaseSensitive: true,
      },
      important: false,
    });
  });

  it('handles important block priority and unsupported modifiers conservatively', () => {
    expect(parseNetworkFilter('||ads.example^$important')?.important).toBe(true);
    expect(parseNetworkFilter('||ads.example^$redirect=empty')).toBeNull();
    expect(parseNetworkFilter('||ads.example^$removeparam')).toBeNull();
    expect(parseNetworkFilter('||ads.example^$popup')).toBeNull();
  });

  it('supports exact EasyList YouTube ad endpoints without broadening them', () => {
    expect(parseNetworkFilter('||youtube.com/pagead/')).toMatchObject({
      action: 'block',
      condition: { urlFilter: '||youtube.com/pagead/' },
    });
    expect(parseNetworkFilter('||youtube.com/youtubei/v1/player/ad_break')).toMatchObject({
      action: 'block',
      condition: { urlFilter: '||youtube.com/youtubei/v1/player/ad_break' },
    });
    expect(
      parseNetworkFilter('||googlevideo.com/videoplayback?$rewrite=abp-resource:abp.js')
    ).toBeNull();
  });

  it('ignores comments, cosmetic filters, malformed domains, and unsafe patterns', () => {
    expect(parseNetworkFilter(42)).toBeNull();
    expect(parseNetworkFilter('! comment')).toBeNull();
    expect(parseNetworkFilter('##.ad')).toBeNull();
    expect(parseNetworkFilter('||ads.example^$domain=not_a_domain')).toBeNull();
    expect(parseNetworkFilter('||ads example^')).toBeNull();
  });

  it('rejects empty, unknown, and mutually incompatible modifiers', () => {
    expect(parseNetworkFilter('||ads.example^$script,,image')).toBeNull();
    expect(parseNetworkFilter('||ads.example^$unknown-type')).toBeNull();
    expect(parseNetworkFilter('||ads.example^$script,~image')).toBeNull();
  });

  it('removes badfilter-disabled rules, deduplicates, and enforces rule limits', () => {
    const result = compileFilterLists(
      [
        {
          id: 'one',
          text: '||disabled.example^$script\n||disabled.example^$script,badfilter\n||same.example^\n||same.example^',
        },
        { id: 'two', text: '||other.example^\n@@||allowed.example^' },
      ],
      { maxRules: 2, firstId: 40 }
    );
    expect(result.rules.map((rule) => rule.id)).toEqual([40, 41]);
    expect(result.rules.map((rule) => rule.condition.urlFilter)).toEqual([
      '||same.example^',
      '||other.example^',
    ]);
    expect(result.report).toHaveLength(2);
  });

  it('retains allow exceptions when within the bounded set', () => {
    const { rules } = compileFilterLists([
      { id: 'list', text: '||ads.example^\n@@||safe.example^' },
    ]);
    expect(rules[1]).toMatchObject({ priority: 2, action: { type: 'allow' } });
  });

  it('enforces each source limit and prioritizes important block rules', () => {
    const result = compileFilterLists(
      [
        {
          id: 'list',
          text: '||ordinary.example^\n||urgent.example^$important\n@@||allowed.example^',
        },
      ],
      { maxRules: 10, maxRulesPerSource: 2 }
    );
    expect(result.rules.map((rule) => rule.priority)).toEqual([1, 3]);
    expect(result.report[0].truncated).toBe(1);
  });
});
