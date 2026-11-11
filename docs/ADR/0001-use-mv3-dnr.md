# ADR-0001: Use Manifest V3 and declarativeNetRequest for Network Blocking

**Status:** Accepted  
**Date:** 2026-11-12  
**Author:** Initial scaffold

## Context

The extension must block ad and tracker network requests on Chromium browsers. Two APIs are available:

1. `webRequest` (Manifest V2 blocking mode) — synchronous, full access to request/response, but deprecated in MV3.
2. `declarativeNetRequest` (MV3) — declarative rule engine enforced natively by Chrome; no JavaScript in the request path.

Chrome has deprecated MV2 and will eventually remove it. Chrome Web Store now requires MV3 for new submissions.

## Decision

Use **Manifest V3** with **declarativeNetRequest** exclusively. Never use `webRequest` in blocking mode.

## Consequences

- **Positive:** Extension is future-proof, passes Chrome Web Store review, faster blocking (no JS per request), better privacy (no access to request bodies).
- **Negative:** DNR has rule count limits (30,000 static, 5,000 dynamic); complex EasyList rules that cannot be represented in DNR are discarded.
- **Mitigation:** The build script tracks how many rules are discarded and logs a summary. If the discard rate exceeds 20%, a new ADR will decide whether to implement a supplementary content-script–based URL blocker.
