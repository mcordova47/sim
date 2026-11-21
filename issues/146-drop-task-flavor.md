---
id: "146"
title: "Drop the task flavor lines and park the approved ones"
short: "Drop task flavor lines"
status: review
owner: claude
depends_on: ["145"]
summary: "Remove the never-drawn task flavor lines from the game and docs; park the ones Marc approved in docs/ideas.md."
kind: chore
unverified:
  - "The flavor lines were never drawn, so there is no visual change to look at; the golden frames are unchanged (the full suite is green)."
  - "Step 6 of learn module 5 (the sync test) was not re-run: nothing in it touches flavor."
---

## Goal
Marc decided (issue 145, d1) to drop the task flavor lines for now. The ones he approved or rewrote (a keep mark in docs/text-review.md) go into docs/ideas.md as a parked idea; the rest are removed and not recorded.

## Acceptance criteria
- No task flavor value or `Interactable.flavor` field remains in src/; tests check name and prompt only.
- docs/ideas.md lists exactly the approved lines.
- Docs and learn-book exercises no longer mention flavor and still work.
- docs/text-review.md still parses (35 task rows kept, marks kept).

## Progress log
- 2026-11-21 (claude): filed.
- 2026-11-21 (claude): worked on branch issue/146-drop-task-flavor.
  - Counts (from `parseReview` on the doc, cross-checked with `tasks.ts`: all 33 flavor strings matched the doc exactly): 35 task rows, 20 marked keep, 15 unmarked. One keep row (contemplate) has no flavor line, so 19 approved lines are parked in docs/ideas.md ("Task flavor lines (parked)"); 15 unapproved lines were removed from the code and not recorded. Also removed with them, not in the doc and so not approved: water-plant-droop ("It perks up..."), the placeholder-level.ts lines (5, test scaffolding mirroring tasks) and the side project's `flavor`.
  - Side project (`side-projects.ts`): its `lines` are drawn as dialog, but its `flavor` is only copied into the task record by `sideProjectTask`, and nothing reads `Interactable.flavor` except tests, so it is a task flavor line; removed (and the `flavor` field of `SideProject`). Not in the doc, so not parked.
  - Code: removed every `flavor` value in tasks.ts, the `flavor?` field in interactable.ts, and the checks in ui-data, battery, apartment, placeholder-level, side-projects and boxes tests (font checks now cover name and prompt only; the two boxes tests no longer assert flavor).
  - Docs: tasks.md, guitar-skill-design.md, learn 04 and 05 (the wipe-counter task no longer has a flavor line; the "a € in the flavor" check now reads `wipe-counter.name: "€"`; module 5 step 4 is now about the new BIN IS NOT FULL text and the Tasks row of the text review; the source line ranges in module 4 and the STATE_GATED line in module 5 were moved to match the shorter tasks.ts and interactable.ts). The other learn pages never mention flavor.
  - docs/text-review.md: flavor column dropped from the Tasks table (name, prompt, unmet reasons and mark kept; parse unchanged: 298 items, 0 unparsed, 35 task rows, 20 marks); the record-play row now reads Choose a record (it said Flip the record: issue 145 d2); added a one-sentence intro under Tasks (there was none). The frozen snapshot fixture is untouched. The sofa photo row still says "The task has no flavor line" (a marked line, left as is).
  - Learn exercises run in a scratch worktree (since removed): module 4 (wipe-counter at the counter, tests red before and green after, whole suite green after step 4, a `€` in the name gives `wipe-counter.name: "€"`, a `dishs` typo gives the unknown-variable error, the achievement turns sync-draw and transfer-draw red); module 5 steps 2 to 4 (take-trash gated by `trash` goes red at cooldowns.test.ts with `expected +0 to be 10`, green after moving it; ui-data green). The module 4 test one (`dishes` at 2 does not offer your task) also passes before the task exists, as before; not changed.
  - Checks: `npx tsc --noEmit`, `npm test` (169 files, 3863 passed), `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate` all pass; golden frames unchanged.
- 2026-11-21 (claude, independent review): verdict approve.
  - No flavor value or field in src/ (`grep -w flavor src` empty; tsc clean). Pass.
  - docs/ideas.md "Task flavor lines (parked)": checked with my own script (`parseReview` on `git show main:docs/text-review.md`): 35 task rows, 20 keep, 19 with a flavor line; the 19 bullets match `prompt: flavor` exactly, in count, text and order (record-play read as Choose a record). Pass.
  - No unapproved line survives: the 15 unmarked flavors, water-plant-droop's, the placeholder-level lines and the side project's line were each searched under src/, docs/ and scripts/; the only hits are in scripts/fixtures/text-review-snapshot.md, which is unchanged (`git diff main...HEAD -- scripts/fixtures` empty). docs/text-review.md keeps one marked sofa row saying "no flavor line". Pass.
  - docs/text-review.md parses: 298 items, 0 unparsed, 35 Tasks rows, 20 Tasks marks; all 263 other items identical (id and mark); the Tasks rows differ from main only in the record-play name/prompt. Pass.
  - Learn exercises, run in a scratch worktree (removed): module 4 (tests red before the task and green after; whole suite green after step 4; `€` as the name gives `wipe-counter.name: "€"`; a `dishs` typo gives the unknown-variable error; the achievement turns sync-draw and transfer-draw red); module 5 step 3 (`take-trash` with `STATE_GATED` goes red with `expected +0 to be 10`, green after moving it in cooldowns.test.ts). Cited line ranges hold (interactable.ts 9 to 70, tasks.ts 92 to 117 helpers, STATE_GATED at 117, STATE_RULES from 119, TASKS at 394 to 396). Pass.
  - `npm test` (169 files, 3863 passed), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate` all pass; golden frames unchanged. Pass.
  - Scope: only src/ flavor removals and tests, five docs, the issue file; no .claude, PLAN.md, other issues, reference-photos or private details. Pass.
  - Not verified: visual (flavor was never drawn).
  - PLAN.md table needs updating by the planner.
- 2026-11-21 (claude, after the first review): Marc added: plain-command rows leave the text review. Removed 11 rows from the Tasks table (water-plant, tidy-desk, journal, record-play, doomscroll, admire-art, humidifier, take-trash, brush-teeth, shower, charge-phone); 24 rows remain (the 20 with blocked messages plus guitar, fridge-stare, sit, contemplate), 14 of them marked keep. Total items 298 -> 287, 0 unparsed. The 19 parked lines in docs/ideas.md are unchanged (taken before the rows left). `scripts/text-review.test.mjs` had a check that the live doc has at least as many strings as the snapshot; it now allows for these 11 fewer. Learn module 5 step 4 now says to add a take-trash row (the table no longer has one). Needs a second review of this change.
