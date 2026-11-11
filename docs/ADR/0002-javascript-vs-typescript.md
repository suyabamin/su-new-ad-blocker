# ADR-0002: Language Selection — JavaScript (ES2022) vs TypeScript

**Status:** Open  
**Date:** 2026-11-12  
**Author:** Architectural Decision

## Context

The extension requires high reliability, modern syntax, and fast development cycles. TypeScript offers compile-time type safety, whereas modern JavaScript (ES2022) with ES modules requires no compilation step, simpler debugging directly in Chrome DevTools without source maps, and faster test execution.

## Decision

For the Minimum Viable Product (MVP), the project uses standard modern JavaScript (ES2022) with ES modules and JSDoc annotations where appropriate. TypeScript adoption is deferred to post-MVP evaluation to maintain a minimal, robust build pipeline without additional transpile overhead.

## Consequences

- No compile/transpile step required for runtime source files during MVP development.
- Fast iteration with Vitest and Playwright.
- Type safety must be supplemented with runtime assertions, structured contracts, and thorough unit tests.
- Re-evaluation scheduled after Phase 4.
