import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('blocking integration (tests/integration/blocking.test.js)', () => {
  const rulesPath = path.resolve(__dirname, '../../rules/declarative_net_request_rules.json');
  const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));

  // Test set of canonical and known ad URLs
  const sampleAdUrls = [
    'https://ad.doubleclick.net/ddm/trackclk/12345',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    'https://ib.adnxs.com/ut/v3/prebid',
    'https://z.moatads.com/swf/p6.js',
    'https://sb.scorecardresearch.com/beacon.js',
    'https://cdn.krxd.net/controltag?c=123',
    'https://match.adsrvr.org/track/cmf/generic',
    'https://as.casalemedia.com/cygnus',
    'https://ads.pubmatic.com/AdServer/js/pwt/123/pwt.js',
    'https://fastlane.rubiconproject.com/a/api/fastlane.json',
    'https://secure.adnxs.com/seg?add=123',
    'https://adservice.google.com/adsid/google/ui',
    'https://googleads.g.doubleclick.net/pagead/ads',
    'https://static.criteo.net/js/ld/ld.js',
    'https://bidder.criteo.com/cdb',
    'https://widgets.outbrain.com/outbrain.js',
    'https://cdn.taboola.com/libtrc/uncompressed/player.js',
    'https://edge.quantserve.com/quant.js',
    'https://engine.ph.zemanta.com/load/',
    'https://smartadserver.com/diff/rtb/partner/123',
  ];

  it('matches at least 95% of test-case ad URLs against static DNR rules (AC-TH.1-1)', () => {
    let matchedCount = 0;

    for (const adUrl of sampleAdUrls) {
      const urlObj = new URL(adUrl);
      const host = urlObj.hostname;

      // Check if any rule covers this host (||domain^)
      const matches = rules.some((rule) => {
        const filter = rule.condition?.urlFilter;
        if (!filter || !filter.startsWith('||') || !filter.endsWith('^')) {
          return false;
        }
        const ruleDomain = filter.slice(2, -1);
        return host === ruleDomain || host.endsWith(`.${ruleDomain}`);
      });

      if (matches) {
        matchedCount++;
      }
    }

    const matchRate = (matchedCount / sampleAdUrls.length) * 100;
    expect(matchRate).toBeGreaterThanOrEqual(95);
  });
});
