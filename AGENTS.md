# AGENTS.md: Instructions for AI Agents

Project: SU New Ad Blocker (su_new_ad_blocker)
Type: Browser extension, Manifest V3, Chromium first (Chrome, Edge, Brave compatible)

## 1. Read before coding

Read in this order before writing any code:

1. docs/01_PRD.md
2. docs/02_ARCHITECTURE.md
3. docs/03_MANIFEST_PERMISSIONS.md
4. docs/15_TASK_PLAN.md

Then read the spec for the module you are working on.

## 2. Non-negotiable rules

- Manifest V3 only. Do not use Manifest V2 APIs such as blocking webRequest.
- Network blocking uses declarativeNetRequest (DNR) static and dynamic rulesets only.
- No remote code. Do not fetch and execute JavaScript at runtime. No eval, no new Function, no inline script strings.
- No remote scripts or stylesheets in pages or the popup. Bundle everything locally.
- No telemetry or analytics that send data off-device. All statistics stay in chrome.storage.local.
- Request only the permissions listed in docs/03_MANIFEST_PERMISSIONS.md. Adding a permission requires an ADR in docs/ADR/.
- Content Security Policy: no inline scripts in extension pages. Use external .js files.
- Never hardcode secrets, API keys, or user data.
- Respect the licenses of filter lists (EasyList, EasyPrivacy, and others). Record each source in lists/SOURCES.md.

## 3. Coding standards

- Language: modern JavaScript (ES2022), ES modules. No TypeScript in MVP (see ADR-0002 when created).
- Style: Prettier defaults plus ESLint with the recommended config. Run lint before every commit.
- Every message type and storage key must come from its constants file (src/shared/messages.js, src/shared/storage.js). No magic strings.
- Keep functions small (under 50 lines where practical). One responsibility per module.
- Log through src/shared/logger.js only. No console.log in committed code.
- Comments explain why, not what.

## 4. Workflow for each task

1. Pick the next unchecked task in docs/15_TASK_PLAN.md.
2. Write or update the relevant spec doc if behavior changes.
3. Implement the code.
4. Write unit tests (see docs/11_TESTING.md).
5. Run: npm run lint && npm test
6. Check the task's acceptance criteria. Mark it done only if all pass.
7. Add an entry to CHANGELOG.md under "Unreleased".
8. Do not start the next task in the same change unless told to.

## 5. What to do when unsure

- If a spec is ambiguous, write the assumption into docs/ADR/ as a new decision and proceed.
- If a requirement conflicts with a non-negotiable rule above, stop and report the conflict. Do not work around it.
- If a filter list or YouTube selector breaks, fix it in the designated selectors file only, and add a regression test.

## 6. Definition of done

- All acceptance criteria in the task are met.
- Lint and tests pass with no errors or warnings.
- No new permissions without an ADR.
- No console errors when the extension loads on the test pages in docs/11_TESTING.md.
- CHANGELOG.md updated under "Unreleased".
