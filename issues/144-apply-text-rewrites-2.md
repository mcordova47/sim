---
id: "144"
title: "Apply Marc's second batch of text rewrites"
short: "Apply text rewrites 2"
status: done
owner: claude
depends_on: ["143"]
summary: "Marc's 12 second-batch rewrite marks (one item note, eleven task flavor lines) are applied to the game's text."
kind: build
unverified:
  - "Task flavor lines are not drawn anywhere in the game (only stored in tasks.ts since issue 019), so how Marc's longer lines would look on screen was not seen; only the SUNFLOWERS note was rendered."
  - "How the new lines read in play (tone, pace, humour) is unseen."
---

## Goal
The second 'apply the marks in a batch' step of issue 139: apply the 12 `rewrite:` marks now in `docs/text-review.md` (one decor note, eleven task flavor lines), keeping Marc's exact words, as issue 143 did for the first batch.

## Acceptance criteria
- All 12 strings replaced in Marc's exact words; display limits and layouts hold the longer lines at both views; tests and docs updated; docs/text-review.md shows the new text with keep; checks pass; an independent review.

## Progress log
- 2026-11-20 (planner): filed.
- 2026-11-20 (claude): plan: apply the 12 rewrites (SUNFLOWERS note, 11 task flavors), check limits/layout/font/text rules, update docs, render, review.
- 2026-11-20 (claude): built.
  - Strings: the SUNFLOWERS note in src/game/decor-data.ts and the flavor of 10 tasks in src/game/tasks.ts (coffee, drink-coffee, reheat, work-sofa, work-bed, take-trash, recycle-boxes, brush-teeth, sit, shower), Marc's exact words. The code matched the doc's old text for those 11.
  - Code differs from the doc, record-play: the code's task is "Choose a record" (prompt "Choose a record") and had NO flavor at all; "Flip the record" / "Side B is the one you actually like." is not in src/ (only in the doc, from an older version of the task; it was never in code since 326035d). There was nothing to replace, so I ADDED `flavor: 'Side B is the good side.'` to record-play (harmless: flavor is never drawn). Marc may rather want the doc row dropped or the task renamed.
  - Where flavor is shown: nowhere. `Interactable.flavor` is read only by tests (font coverage in ui-data.test.ts, apartment.test.ts, battery.test.ts, placeholder-level.test.ts). The completion popup shows only points and multipliers (game.ts). So there is no display limit, no wrapping and no hard-coded length limit in any test to raise. Longest new lines: recycle-boxes 77 characters (461 px at 1x), take-trash 75 (449), shower 70 (419); the screen is 320 px wide, so if flavor is ever drawn it must wrap to 2 lines at 320 and 3 at 224 (a layout to design then). I did not invent a display or a limit.
  - Font: ' . , ? ! - already exist in src/render/font.ts, "..." is three full stops; '%' is no longer used by these lines. Nothing added, no wording changed.
  - Text rules: no test rejected any line (npm test passes unchanged; tests only check glyph coverage for flavor). No test changed.
  - Notes for Marc (not changed): #11 'Do I have to narrate everything?' is first person, unlike the second-person voice elsewhere; #9 names a real, defunct brand (Blockbuster), where the project keeps real brands for fake-named ad copy; #4 mentions a panic attack.
  - Docs: docs/text-review.md: the 12 lines now show the new text with `keep` (298 items parse, unparsed 0, no rewrite marks left; the record-play row still carries the doc's old name/prompt "Flip the record"). docs/learn/05-state-and-sprites.md step 4 quoted the old take-trash flavor ("The bag was not full..."): updated to quote the new line. The frozen snapshot scripts/fixtures/text-review-snapshot.md is deliberately unchanged. docs/decor.md and docs/tasks.md do not quote any of the lines.
  - Render (headless Chrome, 1x, THINGS page, SUNFLOWERS selected): scratchpad sun-wide.png (320 x 192) and sun-narrow.png (224 x 208, no sprites): the note wraps in 2 and 3 lines inside the box. Flavor lines have no screen to render.
  - Checks: see the end of this log.
  - Checks run: npm test (169 files, 3863 passed), npx tsc --noEmit, npm run build, npm run check:dist, npm run issues:check -- --validate (valid; unrelated warnings on 116, 138, 142).
- 2026-11-20 (claude, independent review): approve.
  - Exact text: my own script compared all 12 strings character for character against src/game/decor-data.ts, the `flavor:` of each task block in src/game/tasks.ts and docs/text-review.md; all 12 match (plain ASCII, straight apostrophes, three full stops). The 11 old strings and the old SUNFLOWERS note have zero hits in src/.
  - Font: a throwaway vitest (deleted) ran every task flavor and the SUNFLOWERS note through GLYPHS after uppercasing: no missing glyph. npm test's font-coverage tests also pass.
  - Flavor not drawn: grep of `flavor` across src finds reads only in tests (font coverage, boxes.test.ts, battery) plus side-projects.ts, which has its own separate `flavor`. No game code reads `Interactable.flavor`, and no test pins a flavor length. Claim holds.
  - record-play: main's tasks.ts had no flavor for it (only the doc row, from the older "Flip the record" task, dropped since 326035d). Adding `flavor` was reasonable: it is inert, keeps Marc's exact words and makes the doc and code agree on the line. The row's name and prompt in the doc still say "Flip the record" (stale; code says "Choose a record"); left alone, as scope.
  - Doc: parseReview on a copy: 298 items, unparsed 0, zero rewrite marks (230 keep, 68 unmarked). `git diff main -- docs/text-review.md` is exactly 12 lines out and 12 in, the 12 old `rewrite:` rows (11 task rows, 1 decor bullet); no other marks touched. docs/learn/05 step 4 now quotes the new take-trash line and its wording stays coherent.
  - Scope: git diff --stat main touches only docs/learn/05, docs/text-review.md, this issue, src/game/decor-data.ts and src/game/tasks.ts.
  - Renders: sun-wide.png (320 x 192) shows the note on 2 lines inside the box; sun-narrow.png (224 x 208) shows 3 lines inside the box, nothing clipped, the lines below it intact. Fine.
  - Checks: npm test (169 files, 3863 passed, 3 skipped), npx tsc --noEmit, npm run build, npm run check:dist and npm run issues:check -- --validate (178 valid, warnings only on unrelated issues) all pass.
  - Unverified (kept in front matter): how the lines read in play, and flavor display (none exists).
