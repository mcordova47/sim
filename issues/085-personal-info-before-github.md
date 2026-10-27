---
id: 085
title: Remove or decide on personal info before the repo goes on GitHub
status: todo
owner: marc + claude
depends_on: []
---

## Goal
Marc (2026-10-27): there should be an issue for removing personal info that blocks putting the repo on GitHub. His name and email are not a worry (GitHub already has them, and the commit author line stays as it is). This issue covers everything else, and it must be done **before the first push**, because the repo has no remote yet (`git remote -v` is empty), so history can still be rewritten with no force-push and nobody else holding copies. Related: issue 084 (hosting, domain, repo name).

## What the planner found (2026-10-27 scan; contents not copied here)
- **Two personal documents are tracked, in history since 2026-10-23:** `docs/about-marc.md` (49 lines) and `docs/tasks-v2.md` (170 lines). The standing rule said personal docs stay local, but they were committed. They are referenced from `docs/make-tracks.md`, `issues/024-personal-touch-interview.md`, `issues/035-task-variety.md` and `issues/059-make-your-own-tracks.md`.
- **The employer's name** appears in one tracked file, `issues/024-personal-touch-interview.md` (the rule is no employer name in the repo).
- **No reference photos were ever committed** (history checked for `reference-photos/` paths, other than the README), and no street address pattern is in any tracked file.
- Not yet checked: the issue and PLAN.md text for other personal details (names of friends and family, places, the real apartment's details beyond the stylised layout), art sources and sprite files for readable text or signatures, `docs/text-review.md`, and any file under `public/` or `art/`.

## Plan
1. **Audit** (an agent, with Marc reading the result): read every tracked file and the full history log messages for personal details beyond name and email; list each with file and line, not copied into any new committed file.
2. **Decide per item with Marc** (planner's recommendation in brackets): `about-marc.md` and `tasks-v2.md` [move out of the repo into an ignored local folder and rewrite history so they never existed; the game's design decisions they hold are already in PLAN.md and the docs]; employer name in issue 024 [edit it out, and rewrite history]; anything else the audit lists.
3. **Do it once, before the first push**: `git filter-repo` (or an equivalent) on a fresh clone to remove the two files and replace the employer name across history; verify with greps over every commit; keep a backup of the original repo outside the working tree until Marc is satisfied. Add the files to `.gitignore` and update the references so nothing links to a missing file.
4. **A guard**: a small check (a test or a script run by `npm test`) that fails if a tracked file contains the ignored personal paths or a configured list of forbidden words (the list itself kept in an ignored local file, never committed).
5. Re-run the checks (`npm test`, `npm run build`), and the greps again, then write the result here.

## Acceptance criteria
- The audit list exists (locally, not committed) and Marc has decided every item.
- No tracked file or commit contains the removed material (verified by grep over the history); the original is backed up outside the repo.
- Links and references no longer point at removed files; `npm test` and `npm run build` pass; the guard is in place.
- The decision about the repo being public or private is written in issue 084's log.

## Progress log
