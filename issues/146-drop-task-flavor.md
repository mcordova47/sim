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
