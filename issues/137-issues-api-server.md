---
id: "137"
title: "Issues API 2: a local server and Answer buttons on the pages"
short: "Issues API: local server and Answer buttons"
status: review
owner: claude
depends_on: ["136"]
summary: "The pages can answer a decision for you when served locally, through the same tested functions."
kind: build
unverified:
  - "Use in Marc's own browser (Safari or his Chrome) and his own phone; the real run used headless Chrome for Testing on a copy of the repo, with a 390 px emulated width rather than a 390 px iframe."
  - "A real commit from the page in the main checkout with Marc's own git identity, global hooks and signing (only temporary copies were used)."
needs: [{who: marc, kind: try, why: "Run npm run issues:serve once and answer a real open decision from the page", since: 2026-11-15}]
---

## Goal
Stage 2 of issue 135: the local server and the buttons.

Design and Marc's answers (2026-11-15): issue 135 (`issues/135-issue-tasks-api.md`): one tested function per task behind everything, the command first, a local server with Answer buttons second; answering edits the issue file in place and, when the main checkout is clean and on `main`, commits it with Marc's git identity, otherwise edits only and says why; first tasks are decisions (answer, drop, defer with a note) and `needs` (add, resolve). The data model and the validator are in `scripts/issues.mjs` (issues 129 to 131); the design is `docs/issues-as-data-design.md`. The repo is public: nothing private in any message or page; never push.

## What to build
- `npm run issues:serve` (also reachable as `npm run tools -- issues --serve`): builds the pages, serves them on 127.0.0.1 only (a random free port printed and opened), and accepts a small POST per task that calls the same functions as the command (issue 136). A per-run token embedded in the served pages is required on every POST (no other tab or site can write); refuse if the issue file changed on disk since the page was built (hash compare), if the main checkout is not on `main`, or if the file has uncommitted edits; the commit rule is the command's; the server never pushes and exposes nothing but the pages and the POST.
- The generated pages show **Answer** controls only when served this way (feature-detect; the static build, a file opened from disk and a machine without the server are unchanged): on a decision card choose an option or write an answer, with Drop and Keep open (defer); on a `needs` card Resolve. After an answer the page updates in place with a calm confirmation; errors are shown in plain words. No urgency wording; the project's calm tone.
- Tests: the POST handler over fixtures (token, stale hash, wrong branch, dirty file, success), the page markup with and without the server; a real run in headless Chrome that answers a decision on a COPY of the repo (never the real one) and checks the diff and the commit; no horizontal scroll at 390 px.

## Acceptance criteria
- Answering from the page produces exactly the edit and commit the command would; every refusal is shown calmly; the static pages are unchanged without the server; nothing listens on a non-local address (tested); the usual checks pass; an independent review that exercises it on a copy of the repo.

## Progress log
- 2026-11-15 (claude): started. Plan: `scripts/issues-serve.mjs` (a request handler as a plain function, plus a thin `http` wrapper bound to 127.0.0.1), a `serve` option on `buildSite` that adds the controls, token, content hashes, `serve.js` and a few styles (without it nothing changes), and `buildFromDisk` in `scripts/issues-site.mjs` so the server rebuilds from disk.
- 2026-11-15 (claude): built. Files: `scripts/issues-serve.mjs`, `scripts/issues-serve.test.mjs` (18 tests), `scripts/issues-site.mjs` (the `serve` option, `buildFromDisk`), `scripts/tools.mjs` (`--serve`), `package.json` (`issues:serve`), `docs/contributing.md` (new short section).
  - How it works: the server rebuilds the pages from disk on every page load (so a reload always shows the truth and a fresh hash); each served page carries the per-run token in a `<meta>` and each control carries its issue's file hash. A POST goes through, in order: Host check (127.0.0.1 or localhost with the port), Origin check, token (constant-time), then branch is `main`, the hash still matches, the file has no uncommitted edits, and only then `editIssue` (the same functions, validation and commit rule as the command). The answer is always recorded as `by: marc`. Free text is sent with `--other` semantics; picking an option sends its text.
  - Controls: Answer on open decisions that live in an issue's front matter (decisions that come from design docs have no controls: they are not in a file this tool edits), Resolve on needs on issue and thread pages. The needs cards on the home and needs pages are links, so they have no button; they update on reload. Controls start hidden and are shown only after the page's script gets a reply from `api/ping` (feature detection); the static build has none of the markup (checked: the static output is byte identical to before apart from the stamp line, which notes uncommitted edits while I work).
  - Nothing else is served: pages and their assets come from the in-memory build by exact name (no path from disk, no directory listing), `Cache-Control: no-store`, a strict Content-Security-Policy (own scripts and styles only, no framing restrictions so that a phone-width iframe works), bodies over 20 KB are refused.
  - Verified: `npm test` (3811 pass), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`. Tests cover the markup with and without the server, every refusal (token missing and wrong, other origin and host, stale hash, uncommitted file, not on main, bad requests), the commit and the no-commit case, what is (not) served, and a real server: binds 127.0.0.1 only (also checked that it does not answer on this machine's other addresses), a different token each run. Real run in headless Chrome (Chrome for Testing, driven over the DevTools protocol) on a temporary git copy of the repo: answered a decision with a free-text answer and another by picking an option, dropped one with a note, kept one open with a note, resolved a need, saw the stale, uncommitted-file, wrong-token and not-on-main messages, and the home page no longer listed the resolved need after a reload; git showed one commit per action touching one file. No horizontal scroll at 390 px or 1000 px on the home, needs, decisions and issue pages.
  - Not checked: Marc's own browser and phone, a commit with his real git identity and signing, and a 390 px iframe (I used the browser's emulated 390 px width, since a page inside a cross-origin iframe cannot be scripted).
