---
id: "161"
title: "Plant wording that still says snake plant for any plant"
short: "Plant wording"
status: done
owner: claude
depends_on: []
summary: "The Green Thumb achievement and a few labels still say snake plant whatever plant is on the shelf."
kind: fix
unverified:
  - "How the reworded achievement line looks in the browser pause screen."
changelog: none
---

## Goal
Marc (2026-11-24) asked for this to be filed after issue 149 made the plant tasks follow the plant on the shelf. A few other places still say "snake plant" for any plant:
- `src/game/achievements/data.ts` (line about 37): the Green Thumb achievement description reads "Water the snake plant three times." It counts waterings of any plant (`water-plant`, `water-plant-droop`), so it should say "Water the plant three times." (or another wording that fits any plant; check the pixel font and the achievements list width).
- `src/game/apartment.ts` (about line 48): a piece named "snake plant"; check whether that name is shown to the player anywhere (a prompt, a dialog, the dev text) and, if so, make it follow the plant or say "plant".
- `src/game/state-vars.ts` (the `plantGrowth` and `plantDry` meanings): developer-facing text; update them to say "the plant on the shelf" only if they are shown somewhere in the game; otherwise leave them.

## Acceptance criteria
- The Green Thumb description no longer names a plant; the achievement still unlocks the same way.
- Every other place that is shown to the player and says "snake plant" for the shelf plant is found (search the source and docs/text-review.md), and fixed or listed with the reason it is correct (for the snake plant's own name, note and THINGS entry it is correct).
- New or changed player-visible text is updated in docs/text-review.md (the text review may mark the achievement line; keep its mark if the meaning is unchanged, or leave it unmarked for review if the wording changed).
- Tests: any test that quotes the old text is updated; a test fails if an achievement or task text names a specific plant that the shelf can swap away from.
- Standard checks pass (`npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`); golden frames unchanged.

## Progress log
- 2026-11-24 (planner): filed on main from Marc's request after merging 149.
- 2026-11-24 (claude): started. Plan: reword Green Thumb, search source and docs for other player-visible "snake plant", add a test.
- 2026-11-24 (claude): done. Findings: only the Green Thumb line was player-visible and wrong; fixed to "Water the plant three times." (unlock condition untouched; same width class as before, shorter). Left as correct: SNAKE PLANT item name, note and `taskName` in decor-data.ts (the snake plant's own); `apartment.ts` prop name "snake plant" is never drawn or shown (only slugged to the id `snake-plant` that side-project-room tests use), so renaming it would only churn ids; `state-vars.ts` meanings are developer text, not shown in the game. docs/text-review.md has no Green Thumb line (only the SNAKE PLANT note, correct), so nothing to mark there. Updated docs/decor.md and docs/random-encounters.md mentions. Added tests in `src/game/achievements/data.test.ts`: no achievement or shelf-plant task text names any plant item's `taskName` (confirmed it fails on the old text). Not checked: how the line looks in a browser.
- 2026-11-24 (reviewer): Review. Verdict: approve.
  - Green Thumb no longer names a plant: pass (`src/game/achievements/data.ts:37` now "Water the plant three times."; `when` unchanged, still `anyOf water-plant, water-plant-droop`, atLeast 3).
  - Other player-visible "snake plant" found or justified: pass. My own grep of src, public, index.html and docs found only: SNAKE PLANT item name, note and `taskName` (the snake plant's own, correct); `apartment.ts:48` prop name (not drawn, only slugged to the id `snake-plant` used by side-project-room tests); `state-vars.ts:27-28` meanings (developer text); comments and tests. Plant task names, prompts and the check-plant cutscene say "plant" and follow `itemWord`. No other plant-naming player text found.
  - docs/text-review.md: pass. It has no Green Thumb line, so nothing to mark; the SNAKE PLANT note is correct. docs/decor.md and docs/random-encounters.md mentions updated accurately.
  - Tests: pass. Old text is not quoted by any other test. In a scratch copy outside the repo I mutated the text: "Water the snake plant three times", "Water the pothos three times" (both fail the achievement test) and "The monstera is doing fine" in the check-plant cutscene (fails the task test). So the new tests guard.
  - Standard checks: pass. `npm test` 177 files, 4141 passed, 3 skipped; `npx tsc --noEmit` clean; `npm run build` ok; `npm run check:dist` ok; `npm run issues:check -- --validate` 195 valid (only pre-existing warnings on other issues). Golden frames unchanged (their tests pass; no art or frame files touched).
  - Scope: only the 5 expected files changed; no PLAN.md or other issue edits.
  - Can't verify: how the line looks in the browser pause screen (listed in `unverified:`). The new text is shorter than the old, so overflow is unlikely.
  - Note for planner: the PLAN.md table needs updating.
