---
id: "137"
title: "Issues API 2: a local server and Answer buttons on the pages"
short: "Issues API: local server and Answer buttons"
status: todo
owner: claude
depends_on: ["136"]
summary: "The pages can answer a decision for you when served locally, through the same tested functions."
kind: build
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

