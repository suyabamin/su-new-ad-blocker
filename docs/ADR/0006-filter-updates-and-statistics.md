# ADR-0006: Local Compilation of Remote Filter Data and Diagnostic Statistics

**Status:** Accepted
**Date:** 2026-11-13

## Context

The existing production rules were derived from test fixtures and synthetic domain padding, while the update action only wrote metadata. Chromium's DNR match feedback is a debugging API and cannot provide dependable packaged-build network totals. The project must keep its existing permissions, local-only statistics, and no-remote-code policy.

## Decision

- Use only the fixed EasyList and EasyPrivacy HTTPS endpoints recorded in `lists/SOURCES.md`; verify their dual GPL-3.0-or-later / CC-BY-SA-3.0-or-later license and attribution.
- Download list text on install, daily alarm, list toggle, and manual request. Omit credentials, reject redirects, cap size, validate headers and supported-rule count, and compile the text locally.
- Use a conservative EasyList-to-DNR subset compiler. Unsupported modifiers are skipped, never emulated with JavaScript.
- Replace only updater-managed dynamic rules in one DNR update operation; retain the prior set on failure. Keep test-only hosts out of production rule artifacts.
- Present network counts only when DNR feedback calls succeed. Mark them unavailable otherwise, describe observed matches as approximate hostname aggregates, and report cosmetic/YouTube hidden-element counts separately.
- Do not add permissions, telemetry, or video/audio playback handling.

## Consequences

- Rule coverage is bounded by DNR quotas and the currently supported syntax; this is not full EasyList parity.
- List text is transient in memory and is not executed or saved to extension storage.
- A successful update can partially refresh sources if one list is unavailable; the UI reports partial success. A total failure leaves previous dynamic rules active.
- Production network statistics may be unavailable because Chrome reserves feedback APIs for development diagnostics.
