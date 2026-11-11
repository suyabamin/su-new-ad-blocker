# ADR-0003: ESLint Version and Migration Plan

**Status:** Superseded — migration to ESLint v9 flat config completed in task TB.1  
**Date:** 2026-11-12  
**Author:** T0.1 Verification

## Context

The initial project setup uses `eslint@^8.57.0` with `.eslintrc.cjs` legacy configuration format. ESLint v8 has reached end-of-life (EOL), but changing ESLint configuration formats during initial repository scaffolding risks introducing lint rule regressions while core modules are not yet implemented.

## Decision

1. Retain `eslint@^8.57.0` with `.eslintrc.cjs` temporarily for T0.1 through early foundation tasks.
2. Schedule task `T0.5` in `docs/15_TASK_PLAN.md` under Phase 0 to migrate to ESLint v9 flat config (`eslint.config.js`) before Phase 1 ends.
3. Remove `.eslintrc.cjs` upon completion of `T0.5`.

## Consequences

- Linting remains stable and operational without blocking initial Phase 0 tasks.
- Technical debt is explicitly tracked and scheduled for resolution in Phase 0 via task T0.5.
