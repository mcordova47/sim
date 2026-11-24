---
id: "161"
title: "Plant wording that still says snake plant for any plant"
short: "Plant wording"
status: todo
owner: claude
depends_on: []
summary: "The Green Thumb achievement and a few labels still say snake plant whatever plant is on the shelf."
kind: fix
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
