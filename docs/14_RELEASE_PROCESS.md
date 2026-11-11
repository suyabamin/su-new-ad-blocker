# 14 — Release Process

## 1. Pre-Release Checklist

- [ ] All tasks in `docs/15_TASK_PLAN.md` are marked `[x]`
- [ ] `npm run lint` exits 0
- [ ] `npm test` exits 0 with all tests passing
- [ ] `manifest.json` version bumped (semver)
- [ ] `CHANGELOG.md` "Unreleased" section renamed to the new version + date
- [ ] No `console.log` in committed code (enforced by ESLint `no-console` rule)
- [ ] No hardcoded secrets or API keys
- [ ] Icons at all required sizes exist: 16, 32, 48, 128 px PNG
- [ ] Privacy policy URL is live and matches `docs/12_PRIVACY_COMPLIANCE.md`

## 2. Build

```bash
npm run build-rules   # Regenerate DNR ruleset from latest filter lists
npm run lint          # Must pass
npm test              # Must pass
npm run build         # Produces dist/su-new-ad-blocker.zip
```

## 3. Build Script (`scripts/build.js`)

1. Cleans `dist/`.
2. Copies: `manifest.json`, `icons/`, `rules/`, `src/`, `lists/SOURCES.md`.
3. Does **not** copy: `tests/`, `scripts/`, `docs/`, `node_modules/`, `.eslintrc.cjs`, `jest.config.js`, filter list `.txt` files.
4. Creates `dist/su-new-ad-blocker.zip`.

## 4. Chrome Web Store Submission

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Upload `dist/su-new-ad-blocker.zip`.
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
