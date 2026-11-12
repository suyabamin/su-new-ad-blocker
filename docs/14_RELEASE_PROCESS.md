# 14 — Release Process

## 1. Pre-Release Checklist

- [ ] All tasks in `docs/15_TASK_PLAN.md` are marked `[x]`
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0 with all tests passing
- [ ] `npm run test:coverage` meets every configured threshold
- [ ] `npm run package` creates `release/su_new_ad_blocker-0.1.0.zip`
- [ ] Extract the archive and verify its manifest and allowed contents
- [ ] `manifest.json` version bumped (semver)
- [ ] `CHANGELOG.md` contains a version heading and release date
- [ ] No `console.log` in committed code (enforced by ESLint `no-console` rule)
- [ ] No hardcoded secrets or API keys
- [ ] Icons at all required sizes exist: 16, 32, 48, 128 px PNG
- [ ] Privacy policy URL is live and matches `docs/12_PRIVACY_COMPLIANCE.md`

## 2. Build

```bash
npm run build-rules   # Regenerate DNR ruleset from latest filter lists
npm run lint          # Must pass
npm test              # Must pass
npm run build         # Bundles content scripts with esbuild into IIFEs and populates dist/
npm run test:e2e      # E2E verification against dist/
npm run package       # Production build and ZIP at release/su_new_ad_blocker-0.1.0.zip
```

## 3. Build Script (`scripts/build.js`)

Per ADR-0005, MV3 content scripts run as classic scripts and cannot contain ES module syntax (`import`/`export`).
The build script performs:

1. Creates `dist/` directory.
2. Bundles content scripts (`src/content/cosmetic.js` and `src/content/youtube/youtube.js`, falling back to `src/content/youtube.js` when the directory entry is absent) with `esbuild` into IIFE files in `dist/content/` (`--bundle --format=iife --target=chrome120 --platform=browser`, minified when `NODE_ENV=production`).
3. Asserts that output bundles contain no top-level `import` or `export` statements.
4. Copies unchanged runtime directories into `dist/`: `src/background/`, `src/popup/`, `src/options/`, `src/shared/`, `src/assets/`, `rules/`, and `icons/`.
5. Generates `dist/manifest.json` from root `manifest.json`, rewriting `content_scripts` paths to the bundled `content/*.js` paths relative to the extension root.
6. Does **not** copy: `tests/`, `scripts/`, `docs/`, `node_modules/`, or raw filter list `.txt` files.

## 4. Chrome Web Store Submission

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Upload `release/su_new_ad_blocker-0.1.0.zip`.
3. Fill in store listing fields from `docs/13_STORE_LISTING.md`.
4. Submit for review (typically 1–3 business days).

## 5. Version Numbering

Follows [Semantic Versioning](https://semver.org/):

- **PATCH** (0.1.x): bug fixes, selector updates, no new features
- **MINOR** (0.x.0): new features, backward-compatible
- **MAJOR** (x.0.0): breaking changes, significant redesigns

The version in `manifest.json` must match the version in `package.json`.

## 6. Post-Release

- Tag the git commit: `git tag v<version>`
- Move `CHANGELOG.md` "Unreleased" section to `[<version>] - YYYY-MM-DD`
- Monitor Chrome Web Store reviews for breakage reports
