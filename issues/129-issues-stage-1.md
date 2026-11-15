---
id: "129"
title: "Issues as data 1: validator and a generated PLAN.md table"
status: todo
owner: claude
depends_on: [128]
---

## Goal
Stage 1 of section 10 of the design: make the issue files checkable and `PLAN.md`'s table generated, with no new schema to learn. It ends hand edits of the table and the drift between table and files (5 rows disagree today), and it is useful even if nothing else ships.

Design and Marc's answers (2026-11-15): `docs/issues-as-data-design.md` (issues stay Markdown with front matter; read locally with a generated page; the recommendations on its questions 3 to 6 are taken; staged plan in its section 10). Nothing here may put anything private in a public repo (no share links, no photos' content). The repo's working rules apply: an agent edits only its own issue file and its code; the planner edits PLAN.md and `.claude/skills/` (except where this issue says otherwise).

## What to build (from the design, sections 4, 6, 7, 9 and 10)
- **A mechanical quoting commit first:** quote the `title` (and escape inner double quotes) in the 72 issue files whose front matter is invalid strict YAML because of an unquoted `: ` in the title. Quote ids too if needed. This is one commit that changes only front matter lines; verify with a strict parser that all files parse after it.
- **`yaml` as a devDependency** (the one new dependency) with a **string-only schema** (the design says `failsafe`; verify it with a test over every issue file: ids like `007`, `010` and `117f` must stay strings, and a numeric id is rejected).
- **`scripts/issues.mjs`:** reads `issues/*.md`, parses front matter and body, validates (the rules and the error and warning lists in section 7 of the design, in plain words with the file name and line), and with `npm run issues` regenerates the table in `PLAN.md` between markers; `npm run issues:check -- --validate` (every push and PR) and `-- --table` (main only: fails if the generated block differs from the committed one, with an error message that tells the planner to run `npm run issues` and commit, also for a merge made on GitHub).
- **`short` and `note`** (optional fields) written by a one-time migration from today's table so the generated table reproduces the current hand-shortened titles and notes (about 50 issues); issue ids stay strings; the table's status column comes from the issue files; the table's thread rows show the derived thread status of the design (section 4.3) only if you implement it in this stage, otherwise keep today's look and say so.
- **`PLAN.md`**: this issue is the one exception to "agents do not touch PLAN.md": add the two markers and regenerate the block once, so the table keeps its present columns and rows (check the diff is explained row by row: the 5 drifted rows and the free-text statuses of 091 and 114 will change; list them in the progress log).
- **CI:** one step in `.github/workflows/ci.yml` for validate on every push and PR, and the table check only on pushes to `main`; `fetch-depth: 0` only if you add anything that needs git dates (stage 1 needs none). Add `dist-issues/` to `.gitignore` (not used yet). Tests (Vitest) for the parser, the validator rules and the table generation over small fixtures plus one test over the real `issues/` folder.
- **Do not** edit `.claude/skills/` (the planner updates `merge-issue` step 6 after this merges), `docs/contributing.md` beyond a short pointer, or any issue body text.

## Acceptance criteria
- All 165 issue files parse strictly; the validator passes on the repo and fails (with plain messages) on fixtures for each error rule; the generated table reproduces today's table except the listed corrections; `npm run issues` is idempotent; `npm run issues:check -- --table` fails on a hand-edited table; `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist` pass; an independent review with a written entry; nothing private in any output.

## Progress log

