---
id: "129"
title: "Issues as data 1: validator and a generated PLAN.md table"
status: review
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

- 2026-11-15 (claude): Started in worktree `../sim-worktrees/129-issues-stage-1`. Plan, in order: quote the 72 titles (one commit); `yaml` devDependency (failsafe schema); `scripts/issues.mjs` with validate and table; migrate `short` and `note`; markers and regenerate PLAN.md; CI step and `.gitignore`; tests.
- 2026-11-15 (claude): Done, set to review. What changed:
  - Commit 1 (`6115145`): 72 `title:` lines quoted, inner double quotes escaped. Checked with Ruby's strict Psych before (72 invalid) and after (0 invalid); `git diff` shows only `title:` lines changed, and each parsed title equals the old raw text.
  - `yaml` 2.9.1 devDependency. Failsafe schema verified: `007`, `010`, `117f` stay strings, `true` stays a string, dates stay strings; the test over every issue file asserts string ids matching the file name, and a numeric id (`id: 7`) fails the validator.
  - `scripts/issues.mjs` (parser, validator, table, CLI) and `scripts/issues.test.mjs` (24 tests: parser, each error rule on fixtures, table generation and idempotence, hand-edited table detected, the real `issues/` folder). npm scripts `issues` and `issues:check` (`-- --validate`, `-- --table`).
  - Rules implemented: required keys, id pattern and equals file-name prefix (also the raw `id:` line), unique ids, status enum, `depends_on` is a list of existing ids, no self-dependency, dependency loops, `thread` and `superseded_by` targets exist, no `superseded_by` loops, bad file names, invalid YAML with line number. Warnings: a done root with members not done (today 106, 111, 113 and 117, as the design expected), unknown keys, duplicate headings, a thread parent that does not exist, a superseded issue that is not done or todo. Not implemented because their fields do not exist yet (stage 2 and 3): `needs`, `decisions`, `area`, date and `links` checks.
  - `short` written in 47 issues and `note` in 11 (from the old table); then the markers and one regeneration of PLAN.md.
  - CI: `issues:check -- --validate` on every push and PR; `--table` only on pushes to `main`. No `fetch-depth` change (no git dates used). `dist-issues/` in `.gitignore`. One line in `docs/contributing.md`.
  - The status column shows the file's own `status` (plus `(note)`). The derived thread status of design section 4.3 is NOT implemented in this stage, so thread rows keep today's look.
- 2026-11-15 (claude): Every changed PLAN.md row (old table versus generated), 169 rows before and after, same order:
  - 007 and 009 depends: `007a-d` and `009a-d` shorthand now lists the ids (007a, 007b, 007c, 007d; likewise 009).
  - 009 status: table said done, file says `blocked` (drift; fix is in the file, not done here).
  - 026 depends: table empty, file says 021, 022, 023 (the file wins).
  - 031 depends: table empty, file says 033.
  - 044 depends: table 034, file says 034, 047.
  - 053 depends: table 052, file says none.
  - 065, 066, 072 status: table done, file `review` (drift; the files were never closed on main).
  - 091: free-text status "design done, build issues filed" becomes `todo (design done, build issues filed)` (file status todo, text kept as `note`).
  - 113: table `todo (design first)`, file is `done`.
  - 114: free-text status becomes `todo (design done, see docs/guitar-skill-design.md; build is 114a to 114c)` (wording changed slightly to avoid nested brackets).
  - 129 (this issue): `todo` becomes `review`.
  - Not changed: the 11 existing notes (026, 048, 049, 062, 083, 084, 085, 095, 113e plus 091 and 114 above), all other rows, order. The 5 status drifts the design counted (009, 065, 066, 072, 113) are all among these; the extra depends drifts (026, 031, 044, 053, 007, 009) were found by this comparison and are not in the design's count.
- 2026-11-15 (claude): Not verified: the CI workflow itself (not run on GitHub; only the commands were run locally); behaviour of the main-only table check across a merge commit followed by a separate regeneration commit (the check runs on the pushed tip, so it only fails if the two commits are pushed separately and the first is checked). The planner should run `npm run issues` after each merge and push both together.
