---
id: "160"
title: "A simple changelog for production releases, from the issues"
short: "Release changelog"
status: done
owner: marc + claude
depends_on: []
summary: "Draft a high-level changelog of what a production release adds, from the done issues merged since the last release."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Where should the changelog show up?"
    options:
      - "a command that prints a draft (npm run changelog) from what is on main and not yet on production, which you read before deploying and can paste into a GitHub release"
      - "the same command, but a CHANGELOG.md is also committed at each release"
      - "a draft in the deploy workflow's summary or a GitHub release created on deploy"
      - "an in-game 'what's new' page as well (a later idea)"
    recommendation: "a command that prints a draft: nothing committed, nothing to forget, and you can edit before using it"
    status: answered
    answer: "the command (npm run changelog) printing a draft from what is on main and not on production; and the deploy workflow also runs it (Marc suggested it commits the result: see d2)"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "Changelog in the deploy workflow (160, d2): what should the workflow do with the generated changelog?"
    options:
      - "write it to the job summary and create a GitHub Release (tag) with the notes: no commit, so main and production never diverge"
      - "commit CHANGELOG.md to main, then fast-forward production to that commit (the workflow pushes to main too, so your local main needs a pull afterwards)"
      - "both: a GitHub Release and a committed CHANGELOG.md"
    recommendation: "write it to the job summary and create a GitHub Release (tag) with the notes: no commit, so main and production never diverge"
    status: answered
    answer: "write it to the job summary and create a GitHub Release (tag) with the notes: no commit, so main and production never diverge"
    by: marc
    on: 2026-11-24
unverified:
  - "The deploy workflow was not run on GitHub: the new steps were checked by reading and by running their shell bodies locally with a stubbed gh."
  - "That gh release create works with the built-in GITHUB_TOKEN here (it needs contents: write, which the workflow has) was not run."
  - "That origin/production is present in the Actions checkout (fetch-depth 0 fetches all branches) was read from the checkout action's documented behaviour, not run."
---

## Goal
Marc (2026-11-24): a simple, high-level changelog for production releases, generated from the issue files.

## Notes (planner)
- **The raw material exists.** Each merge to `main` is a commit "Merge NNN: title", and each issue file has `title`, `short`, `summary`, `kind` (design, build, research, fix, umbrella, chore) and a status. The commits on `main` that are not on `production` (`git log production..main`, or `origin/production..main`) are exactly what a release would add.
- **Filtering.** Players care about `build` and `fix` issues; `design`, `research`, `chore` and `umbrella` are mostly process. An optional front matter line (for example `changelog: "Order takeout at the nightstand and eat it at the table."`) would let an issue say its player-facing sentence; without it the `summary` is used; `changelog: none` (or a non-player kind) leaves it out. Everything stays plain data, validated by `npm run issues:check`.
- **Grouping.** Group by kind (New, Fixes), newest first; link each line to its issue number.
- **Public repo.** The changelog is generated from public issue text only; nothing private. Because gifts arrive on later game days, a line can say when new things start arriving in play.
- Not for decor or outfit ids; the sentence is for people.

## Acceptance criteria
Decided by Marc (d1, d2, 2026-11-24): a command prints a draft changelog; the deploy workflow also runs it, writes it to the job summary and creates a GitHub Release (a tag) with the notes; nothing is committed, so `main` and `production` never diverge.
- **The command.** `npm run changelog` (script `scripts/changelog.mjs`, with pure functions in a module with tests) prints Markdown for what a release adds: the done issues merged to `main` that are not yet on `production`. Options: `--from <ref>` (default `origin/production`, falling back to `production`, then to the first commit if neither exists, with a plain note) and `--to <ref>` (default `HEAD`). It finds the merges (`Merge NNN: ...` commits in the range, plus issue files whose status turned done in the range) and reads the issue files at the target ref (not from the working tree, so it works on a clean checkout of a tag).
- **Filtering and grouping.** `build` and `fix` issues are listed (New, Fixes); `design`, `research`, `chore` and `umbrella` are left out unless an issue says otherwise. The line is the issue's optional `changelog:` sentence, else its `summary`; `changelog: none` leaves an issue out of the list regardless of kind. Each line ends with the issue number; the order is newest first within a group. A release with nothing to list says so in one calm line.
- **The new field.** `changelog` is an optional string in an issue's front matter (the validator accepts it, checks it is a short single line of at most 140 characters, and `changelog: none` is allowed); document it in docs/contributing.md and docs/issues-as-data-design.md; add `changelog:` sentences to the recent player-facing issues (147, 149 if merged by then, 151 to 159) so the first real release reads well. No private details; the repo is public.
- **The workflow.** In `.github/workflows/deploy.yml`, after checks and before or after the push to `production` (the agent decides which is safer and says why), run the command over the range from the previous production commit to the ref, append the output to `$GITHUB_STEP_SUMMARY`, and create a GitHub Release with a tag (for example `release-YYYY-MM-DD-HHMM` or a sequence) whose body is the notes, using only the built-in `GITHUB_TOKEN` (permissions `contents: write` already); the workflow must not commit anything and must still work when there is no previous release (a first run) or nothing to list. Test the workflow logic locally as far as possible (the command on the real repo history, a dry run of the shell steps) and say plainly what could only be verified on GitHub; nothing is deployed or run on GitHub by the agent.
- Docs: docs/deploy.md (what the workflow now does and how to read a release) and a line in the README or docs index if the other docs link to deploy.md. Standard checks pass: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`.

## Progress log
- 2026-11-24 (planner): filed on main with its open decision (the issue file is born on main).
- 2026-11-24 (agent): started. Plan: pure module scripts/changelog-lib.mjs with tests, CLI scripts/changelog.mjs reading issue files from git at the target ref, the `changelog` field in the validator, sentences on recent issues, two soft-failing workflow steps, docs.
- 2026-11-24 (agent): done, in review. Files: scripts/changelog-lib.mjs, scripts/changelog.mjs, scripts/changelog.test.mjs (13 tests, including the command over a throwaway repo), scripts/issues.mjs (`changelog` accepted and checked: non-empty, one line, at most 140; `none` allowed), package.json (`npm run changelog`), .github/workflows/deploy.yml, docs/deploy.md, docs/contributing.md, docs/issues-as-data-design.md, and a `changelog:` line on issues 136, 137, 140, 141, 143, 144, 147, 151 to 158 (149 and 159 are in other worktrees, left alone; 150 is not merged).
  - Workflow choice: notes are drafted BEFORE the push (origin/production still names the previous release) and the GitHub Release is created AFTER a successful push, so a notes problem cannot delay a deploy and a failed push never leaves a release for something that did not ship. Both new steps are `continue-on-error: true` and guard on the notes file. Existing steps and their order are untouched; the new steps sit around "Fast-forward production".
  - Real history: `origin/production` is at 585e3a0, so the default range is empty on this checkout ("Nothing new for players in this release."). With no production branch (the first-release fallback, 1573 commits) the draft lists 143, 144, 147, 151 to 154 and 156 only, because 166 older issues have no `kind`; that is d3 (open, default: write the first headline by hand).
  - Checked: npm test (3994 pass), npx tsc --noEmit, npm run build, npm run check:dist, npm run issues:check -- --validate; the two workflow shell bodies were run locally with a stub `gh` (notes present: release called with the notes file; notes absent: skipped, exit 0).
  - Not checked: anything on GitHub (see `unverified`).
- 2026-11-24 (review, independent): verdict APPROVE. Re-ran npm test (3994 pass), npx tsc --noEmit, npm run check:dist, npm run issues:check -- --validate (194 valid, only old warnings). Own edge checks in a throwaway repo (outside the tree): ids with letters (002a listed), a Merge commit for an issue not done (skipped), an issue turned done with no Merge commit (listed), `changelog: none` on a fix (skipped), a design issue with its own sentence (listed under New), chore with none (skipped), empty range and reversed range (one calm line), bad --from (plain error, exit 1), unknown flag (usage, exit 2), no production branch (note on top, full history), `--to` a tag and nothing in the working tree (works from git). Length: 139 and 140 pass, 141 is rejected with a plain message; multi-line, empty and non-string rejected; `none` and `None` accepted. Real-history output over all commits lists only the 8 expected player-facing lines, no private text. Workflow read line by line: existing steps and their order intact, nothing removed; the two new steps are continue-on-error, the release step skips on a missing or empty notes file (a failed node run leaves an empty file), no commits or pushes other than the existing production push, release runs only after a successful push, first run (no origin/production) falls back to the first commit, an empty release says so plainly.
  - Criteria: command and options pass; filtering and grouping pass; new field and validator pass; docs (deploy.md, contributing.md, issues-as-data-design.md) pass; changelog lines on 136 to 158 pass (149 and 159 are in other worktrees, so left for later; fine); workflow pass by reading and local simulation; standard checks pass. Workflow running on Actions, `gh release create` with GITHUB_TOKEN, and origin/production being in the Actions checkout are UNVERIFIED (already in `unverified`).
  - Minor, no action needed: `--from` with no value silently uses the default range; a changelog sentence of exactly "none." would be listed; a re-deploy of an unchanged commit makes another "nothing new" release. d3 stays open (default: write the first headline by hand).
  - Planner: the PLAN.md table needs updating (160 done). Branch to merge: issue/160-release-changelog.
