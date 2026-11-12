# Phase 3 YouTube Investigation and Owner Acceptance

**Date:** 2026-11-13  
**Branch:** `main`  
**Extension:** 0.1.0, unpacked `dist/`  
**Browser:** Chromium 158.0.8127.18

## Findings and changes

The baseline audit is recorded in [PHASE3_BASELINE_REPORT.md](PHASE3_BASELINE_REPORT.md).
It found that the installed static ruleset had no YouTube or `googlevideo.com` rules. Generic
third-party ad domains such as `doubleclick.net` and `googlesyndication.com` were covered.
The installed test profile had zero active dynamic rules; a manual list update failed because
the browser could not fetch filter lists. The stored update metadata was stale and did not
prove that rules were active.

The real YouTube site could not be reached in this environment, so no live advertisement
root cause can be confirmed. Verified code-level gaps were that YouTube had no separate
counter for selector matches that were not hidden, the selector set lacked several narrow
current EasyList renderers and mobile YouTube coverage, and direct repeated observer
installation was not idempotent. Normal startup installed the observer once; the installer
could still create duplicate observers for other callers. Separately, background summary
messages and cosmetic reports could race asynchronous storage initialization and expose or
overwrite default in-memory values. Initialization is now awaited before those paths run.
Selectors were added only for ad-specific markup. No first-party YouTube or Googlevideo DNR
rules were introduced.

EasyList version `202611122215` includes exact `||youtube.com/pagead/` and
`||youtube.com/youtubei/v1/player/ad_break` filters plus scoped cosmetic entries for search,
feed, sidebar, Shorts, and mobile placements. The compiler accepts the two exact network
filters, but their presence in a filter list is not evidence that blocking them preserves
normal player behavior. EasyPrivacy version `202611122211` has YouTube entries targeting
statistics/measurement endpoints; those are not proof of ad media. See
[EasyList](https://easylist.to/easylist/easylist.txt) and
[EasyPrivacy](https://easylist.to/easylist/easyprivacy.txt).

## Category results

`PARTIAL` means code behavior passed synthetic fixture tests. `NOT VERIFIED` means there was
no live YouTube observation.

| Ad category                         | Detection    | Cosmetic hiding | Network blocking | Live verified |
| ----------------------------------- | ------------ | --------------- | ---------------- | ------------- |
| Video ads (pre/mid/post-roll)       | NOT VERIFIED | NOT VERIFIED    | NOT VERIFIED     | NOT VERIFIED  |
| Overlay ads                         | PARTIAL      | PARTIAL         | NOT VERIFIED     | NOT VERIFIED  |
| Page banners                        | PARTIAL      | PARTIAL         | NOT VERIFIED     | NOT VERIFIED  |
| Sponsored cards/promoted placements | PARTIAL      | PARTIAL         | NOT VERIFIED     | NOT VERIFIED  |
| Search ads                          | PARTIAL      | PARTIAL         | NOT VERIFIED     | NOT VERIFIED  |
| Sidebar ads                         | PARTIAL      | PARTIAL         | NOT VERIFIED     | NOT VERIFIED  |
| Shorts ads                          | PARTIAL      | PARTIAL         | NOT VERIFIED     | NOT VERIFIED  |
| Home feed ads                       | PARTIAL      | PARTIAL         | NOT VERIFIED     | NOT VERIFIED  |

Fixture results establish selector behavior only. They do not establish that current
YouTube markup matches these selectors or that an advertisement was blocked.

## Statistics and limitations

- DNR counts are diagnostic event matches, available only where Chrome exposes the feedback
  API. Events are deduplicated using request IDs in `chrome.storage.session`; counting stops
  if this session state cannot be restored or persisted.
- Generic cosmetic, YouTube detected, and YouTube successfully hidden counts remain separate.
  YouTube detection is a unique selector match; hidden is a unique successful inline hide.
  “Detected but not hidden” is derived and clamped at zero for older data.
- Popup and Options read the same daily stored categories. Network diagnostics remain
  explicitly unavailable when not observed, and chart gaps remain null rather than fabricated
  zeros.
- A selector match can be a false positive. None of these UI counts means a video ad or a
  network request was blocked.
- Open shadow roots, dynamic insertion, class/style changes, and SPA rescans have synthetic
  regression coverage. Closed roots cannot be inspected. Live behavior remains unverified.

## Validation

| Command                     | Result                                                                      |
| --------------------------- | --------------------------------------------------------------------------- |
| `npm.cmd run lint`          | PASS                                                                        |
| `npm.cmd test`              | PASS, 26 files / 209 tests                                                  |
| `npm.cmd run test:coverage` | PASS, 84.80% statements / 79.39% branches / 85.37% functions / 84.70% lines |
| `npm.cmd run build`         | PASS                                                                        |
| `npm.cmd run test:e2e`      | PASS, 8 tests                                                               |
| `npm.cmd run test:perf`     | PASS, 0.3 ms median added load time, 10 paired runs                         |

E2E confirms extension loading, a test ad-domain DNR block, dashboard rendering, unavailable
diagnostics behavior, and no match for a normal-shaped `googlevideo.com/videoplayback` media
URL in the packaged rules. `testMatchOutcome` is a rules simulation, not observed YouTube
playback.

## Live browser attempt

The unpacked `dist/` build loaded in Chromium 158.0.8127.18 using Playwright's supported
`--disable-extensions-except` and `--load-extension` arguments. A fresh isolated profile was
used (signed out). Attempts to load the homepage, search results, a watch page, and Shorts all
failed with `net::ERR_NETWORK_ACCESS_DENIED`. No ad was served, no video played, and no live
cosmetic or network result could be observed. The attempt ran at `2026-11-12T22:33:19Z`
(2026-11-13 04:33 Asia/Dhaka). Request and page results are recorded in
`.pw-tmp/phase3-real-youtube/results.json`; the profile and screenshot are intentionally
retained.

## Privacy, permissions, and compatibility

The manifest remains MV3 with the existing five permissions and `<all_urls>` host permission;
no permission, telemetry, remote code, or playback manipulation was added. Static DNR
regression coverage finds no packaged rule matching the sampled normal video media URL.
Only Chromium was tested. Edge and Brave were not tested.

## Owner acceptance

**PARTIAL — Cosmetic improvements verified; video ad blocking remains unverified or incomplete.**
