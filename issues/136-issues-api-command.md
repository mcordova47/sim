---
id: "136"
title: "Issues API 1: the edit functions and the command"
short: "Issues API: edit functions and command"
status: review
owner: claude
depends_on: ["135"]
summary: "Edits to decisions and needs are done by tested functions and one command, so they cannot be done wrongly."
kind: build
unverified:
  - "A real commit made by the command in the main checkout with Marc's own git identity (only temporary repos were used)."
needs: [{who: marc, kind: try, why: "Run npm run issues -- answer on a real open decision once", since: 2026-11-15}]
---

## Goal
Stage 1 of issue 135: the edit functions and the CLI.

Design and Marc's answers (2026-11-15): issue 135 (`issues/135-issue-tasks-api.md`): one tested function per task behind everything, the command first, a local server with Answer buttons second; answering edits the issue file in place and, when the main checkout is clean and on `main`, commits it with Marc's git identity, otherwise edits only and says why; first tasks are decisions (answer, drop, defer with a note) and `needs` (add, resolve). The data model and the validator are in `scripts/issues.mjs` (issues 129 to 131); the design is `docs/issues-as-data-design.md`. The repo is public: nothing private in any message or page; never push.

## What to build
- In `scripts/issues.mjs` (or a new module it imports) pure functions over the issue file's text: `answerDecision(text, decisionId, answer, { by, on })` (also `drop`, `defer` which keeps it open with a dated note), `addDecision(text, decision)` (the open-question form the planner writes today), `resolveNeed(text, index or match)`, `addNeed(text, need)`. Each edits the front matter **in place**, keeping the order of keys, quoting style and everything else byte for byte (use the `yaml` package's Document API or a careful line edit; test that the rest of the file is unchanged), validates the result with the same rules as the validator, and refuses with a plain message on any error (unknown issue or decision id, already answered, an answer that is not one of the options when the decision lists options and `--other` was not given, missing fields).
- A command: `npm run issues -- answer <issue> <decision> "<answer>"` (accepting an option's letter or text), plus `drop`, `defer`, `ask`, `need add`, `need resolve`, and `--dry-run` that prints the diff and writes nothing; after a real edit it runs the validation and `npm run issues` (the table) and, when the main checkout is on `main` and `git status` is clean apart from the issue file, commits it with Marc's own git identity and a plain message such as `134: answered d1`; otherwise it only edits and says why it did not commit. Never pushes.
- Tests: over fixtures (every function, every refusal, the in-place guarantee on a file with comments and odd quoting) and over a copy of the real issues folder (answer 134's d1 and check the diff is exactly the status, answer, by and on lines). A short section in `docs/contributing.md` explaining the command and how an answer looks in the file (the planner will review wording).

## Acceptance criteria
- Each function leaves the rest of the file untouched (tested); refusals are plain; `--dry-run` writes nothing; the commit step runs only on a clean main checkout; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review with a written entry.

## Progress log
- 2026-11-15 (claude): started. Plan: pure splice-based edit functions in `scripts/issues-edit.mjs` (positions from the `yaml` package's source ranges, so only the changed place differs; a built-in check re-parses the result and compares it with the intended data), a thin I/O and git layer in `scripts/issues-edit-io.mjs`, the command wired into `scripts/issues.mjs`.
- 2026-11-15 (claude): built. I did not use the Document API to print the file (it would re-quote and re-indent); it is used only to find ranges, and every edit is a splice of the original text, so no round trip can change bytes. Added `note` as a known decision field (used by defer and drop). Files: `scripts/issues-edit.mjs`, `scripts/issues-edit-io.mjs`, `scripts/issues-edit.test.mjs`, `scripts/issues.mjs` (dispatch, `note`), `docs/contributing.md` (new section). Tests (45) cover every function and refusal on fixtures with comments, odd quoting, flow and block layouts; add-then-resolve over all 174 real files restores the bytes; the command on a copy of the issues folder (134 d1: diff is the status, answer, by and on lines); the commit step on temporary git repos. `npm test`, `tsc --noEmit`, `npm run build`, `check:dist` and the validator pass.
- Could not check: use through the real `npm run issues` with a real commit (only dry run on the real repo; commits tested on temp repos).
