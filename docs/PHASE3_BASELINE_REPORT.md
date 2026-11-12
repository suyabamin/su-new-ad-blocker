# Phase 3 Baseline Audit

**Recorded:** 2026-11-13 (Asia/Dhaka)

**Branch and commit:** `main`, `c771173` (`fix: harden statistics and YouTube diagnostics`)
**Audit state:** No source or documentation changes had been made when this report was recorded.

## Git state

The tracked working tree was clean. The only pre-existing untracked file was
`.manual-chrome-extensions.png`; it was preserved. Recent history:

- `c771173` — harden statistics and YouTube diagnostics
- `d9e37de` — refresh DNR load measurements
- `eeaad53` — update filter-compiler tests

## Architecture and current YouTube behavior

The extension is Manifest V3. Its declared permissions are `declarativeNetRequest`,
`declarativeNetRequestFeedback`, `storage`, `alarms`, and `activeTab`, with `<all_urls>` as
the existing host permission. The YouTube content script is registered for
`https://www.youtube.com/*` at `document_start`. It injects the selectors in
`src/content/youtube/selectors.js`, hides matching elements using inline `display:none`,
reports the number newly hidden, and watches the document body plus discovered open shadow
roots for child, class, and style mutations. SPA events trigger a document rescan. Closed
shadow roots are inaccessible. The code does not manipulate playback.

The current counter measures elements hidden by those selectors; it does not distinguish
advertisement detection from a successful hide and does not prove that an element is an ad.
The current fixed selector set does not include all YouTube cosmetic rules in current
EasyList. The network compiler handles network filters only; it deliberately skips cosmetic
syntax and unsupported modifiers.

## DNR and filter-list findings

The packaged static ruleset contains 116 rules, all with `block` actions. Its YouTube-adjacent
matches are generic rules for `doubleclick.net`, `googlesyndication.com`, and
`pagead2.googlesyndication.com`; it contains no rule matching `youtube.com` or
`googlevideo.com`. This audit found no broad YouTube first-party or media-stream rule in the
packaged artifact.

The live EasyList source dated 2026-11-12 includes network filters for `youtube.com/pagead/`
and `youtube.com/youtubei/v1/player/ad_break`, as well as `youtube.com##` cosmetic filters for
home-feed ad slots, search placements, Shorts ad slots, and sidebar placements. The current
compiler can represent the two simple URL filters but does not compile those cosmetic rules.
EasyList also contains a `googlevideo.com/videoplayback` rule with `$rewrite`; the compiler
rejects that unsupported modifier, and the rule is scoped to other domains rather than
YouTube. EasyPrivacy includes YouTube analytics/ad-statistics endpoints, which are not by
themselves evidence of an ad media request. These source entries do not establish that
blocking any `googlevideo.com` request would preserve normal video playback.

In the fresh unpacked test profile, `getDynamicRules()` returned zero rules while local
`stats:meta` reported `filterUpdateRuleCount: 4000` from a recorded earlier update. A manual
`LIST_UPDATE_NOW` returned `Failed to fetch`, leaving zero dynamic rules. The discrepancy
needs investigation; the stale timestamp/count is not proof that those rules are currently
installed. A separate isolated API smoke test confirmed that a single test dynamic rule
persists across a Chromium restart. Chromium's unpacked-only `testMatchOutcome()` returned no
match for a `googlevideo.com/videoplayback` media request or the narrow YouTube
`/youtubei/v1/player/ad_break` and `/pagead/ads` paths. It matched the packaged static
`doubleclick.net` rule for `googleads.g.doubleclick.net/pagead/id`. These are rule-engine
simulations; they do not prove those requests were sent or that a live ad was blocked.

## Real-browser baseline

- Browser: Playwright Chromium `158.0.8127.18`.
- Extension: unpacked `dist/`, version `0.1.0`.
- Profile: fresh, signed out; the page showed a **Sign in** link.
- Homepage: `https://www.youtube.com/` loaded its page shell once. In a later visit it showed
  “Connect to the internet”; an empty `#masthead-ad` container was hidden, but no actual
  advertisement was observed.
- Search: `https://www.youtube.com/results?search_query=popular+music+video` loaded an empty
  page shell; no result or advertisement was observed.
- Video: no watch link was available from the blank search results, so no video was tested.
- Shorts: `https://www.youtube.com/shorts` failed with `net::ERR_FAILED`.
- Network: YouTube API requests timed out with `ERR_QUIC_PROTOCOL_ERROR.QUIC_NETWORK_IDLE_TIMEOUT`;
  `googlevideo.com/videoplayback` requests failed with `ERR_NETWORK_ACCESS_DENIED`.
- No pre-roll or mid-roll ad was served. All YouTube ad categories therefore remain **NOT
  VERIFIED** at baseline, and playback could not be assessed.

Browser observations and screenshots are retained under `.pw-tmp/phase3-*`. The earlier
`.manual-chrome-extensions.png` is a Chrome extensions page with no extension card shown; it
does not establish a successful manual install.

## Baseline automated validation

| Command | Result |
| --- | --- |
| `npm.cmd run lint` | Passed; ESLint and Prettier clean |
| `npm.cmd test` | 26 files, 198 tests passed |
| `npm.cmd run test:coverage` | Passed; 84.69% statements, 79.55% branches, 86.69% functions, 84.60% lines |
| `npm.cmd run build` | Passed |
| `npm.cmd run test:e2e` | 7 passed in Playwright Chromium, including an `ERR_BLOCKED_BY_CLIENT` DNR fixture check |
| Performance baseline | Existing committed 10-run report: 1.70 ms median added load time; it was not regenerated during this baseline audit |

These automated checks do not demonstrate live YouTube advertisement blocking.
