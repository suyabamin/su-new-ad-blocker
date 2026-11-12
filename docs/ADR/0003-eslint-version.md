# ADR-0003: ESLint 9 Flat Configuration

**Status:** Accepted  
**Date:** 2026-11-12

## Context

The project uses modern JavaScript modules and requires consistent linting in local development and CI. ESLint 9 supports a flat configuration file and no longer needs the legacy `.eslintrc` format.

## Decision

Use ESLint 9 with `eslint.config.js` and `@eslint/js` recommended rules. Do not keep `.eslintrc` configuration files.

## Consequences

- Lint configuration is explicit and scoped to source, test, build, and configuration files.
- CI and local checks use the same `npm run lint` command.
- Future lint changes belong in `eslint.config.js`.
