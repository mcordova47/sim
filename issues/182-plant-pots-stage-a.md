---
id: "182"
title: "Plant pots, stage A: the three pots on the bookshelf"
short: "Three pots (stage A)"
status: review
owner: marc + claude
depends_on: ["179"]
summary: "Make the bookshelf vase and bowl real slots next to the plant pot, with kinds, empty items and a save migration."
kind: build
unverified:
  - "The Change plants list on the phone's narrow 224 x 208 view was only drawn in a unit test (box inside the screen), not seen in a browser."
  - "How the list and the vase, bowl and pothos look and feel on a real phone or with touch controls; I looked at the desktop view at 1x, 3x and 8x only."
  - "The bowl's two pixels and the pothos stage 5 vine across the bowl were judged by eye at 8x; whether Marc likes them is his call."
changelog: "The bookshelf now has three pots, each for its own kind of plant: dried arrangements, low plants and houseplants."
decisions:
  - id: d1
    who: marc
    q: "How does the swap menu work across the three pots?"
    options:
      - "a slot-list menu like the outfit slots: one Change plants task at the bookshelf opens a list of the three pots (vase, bowl, plant pot) with the plant in each; left and right pick the plant for the selected pot, E confirms (the same look as the outfit slots)"
      - "one swap task per pot (Change plant, Change vase, Change bowl), each offered only when there is a spare"
      - "one Change plants option that just puts the plant in the appropriate pot"
    recommendation: "a slot-list menu like the outfit slots: one Change plants task at the bookshelf opens a list of the three pots (vase, bowl, plant pot) with the plant in each; left and right pick the plant for the selected pot, E confirms (the same look as the outfit slots)"
    status: answered
    answer: "a slot-list menu like the outfit slots: one Change plants task at the bookshelf opens a list of the three pots (vase, bowl, plant pot) with the plant in each; left and right pick the plant for the selected pot, E confirms (the same look as the outfit slots)"
    by: marc
    on: 2026-11-24
---

## Goal
Build stage A of `docs/plant-pots-design.md` (issue 179, merged), following Marc's answers in `issues/179-plant-pots.md` (d1 to d10): the bookshelf's vase and bowl, baked into the bookshelf sprite today, become slots next to the existing plant pot slot (`plant-shelf`, id kept so saves stay valid): `pot-vase` at abs (160, 16) (starts as the baked dried arrangement), `pot-bowl` at (160, 32) (starts empty, drawn 2 px lower than the baked bowl so a low plant gets 4 clear rows above its rim), and the plant pot at (160, 52) (the snake plant). Kinds: a new item field `plantKind` and slot field `plantKinds` (the vase takes dried arrangements and cut flowers, the bowl takes low plants, the plant pot takes houseplants and the empty pot only; strict: the four existing dried items move to the vase, and an old save that shows one in the plant pot is migrated to the vase by a small rule). Empty pots are ordinary still items (EMPTY VASE, EMPTY BOWL, EMPTY POT) owned from the start, with an `empty` flag so they are not counted as spares and a fresh game shows no new prompt (an empty pot becomes reachable once the first real spare arrives); three more 'ALREADY HERE' lines on the THINGS page. A fresh game differs from today only by the bowl's 2 pixels (Marc: yes). The pothos's stage 5 vine crossing the bowl is accepted. Marc's future idea (drying flowers as an active choice: docs/ideas.md) is not part of this stage.

## Acceptance criteria
- The bookshelf sprite is made bare for the vase and bowl (one edit) and the vase arrangement, empty vase, empty bowl and empty pot are four sprites cut from the existing art (palette only, no text); the props and slots per the design's section 2 and the mockups (`docs/plant-pots-mockups/`), checked against the draw order, the pothos overhang of issue 149 and the task spots.
- `plantKind`/`plantKinds` in `fits`, validation at startup, the migration rule (an old save with a dried item in the plant pot moves it to the vase; tolerant of junk), the item pool (issue 163) and the shops keep working (kinds), THINGS shows the new empty items and the three 'ALREADY HERE' lines.
- The swap menu per d1 (default: a slot-list menu like the outfit slots; read `src/game/activities/outfit-slots.ts` and reuse its pattern; no explanatory text, as Marc asked for the outfit list); the swap tasks appear only when there is a spare for a pot; plant care (watering, droop, the plant variables) stays on the plant pot only and nothing about it changes (design section 5: first step).
- Golden frames re-recorded for the bowl's 2 px (say exactly which frames change and by what); the rest of a fresh game unchanged; tests for each piece (kinds, migration, empties, the swap menu, saves and sync round trip: check `sync/merge.ts` copies decor fields by hand in three places).
- Look at the bookshelf in the running game yourself (dev server, `?own=` for several plant and dried items) in the default state and with each pot changed, at 1x and 8x, and say what you saw; the reviewer must too.
- Docs: docs/decor.md 'What issue 182 built'; new strings into docs/text-review.md; the `changelog:` line stays; standard checks: `npm test`, `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run issues:check -- --validate`, `npm run sprites` leaves git clean.

## Progress log
- 2026-11-24 (planner): filed on main from the merged plant pots design (issue 179) and Marc's answers; not started (Marc asked to file it without starting).
- 2026-11-25 (claude): started. Plan: the three slots and the kinds in the data, a bare bookshelf sprite plus four sprites cut from the old art, the migration in parseDecor, the empties and `empty`, one Change plants list (d1: a slot-list like the clothes list), tests, docs.
- 2026-11-25 (claude): built stage A, ready for review.
  - **Data and rules** (`decor-data.ts`, `decor.ts`): slots `pot-vase` (160, 16), `pot-bowl` (160, 32), `plant-shelf` (id kept, 160, 52); `plantKind` on items and `plantKinds` on slots in `fits` (strict for plants only); validation at startup; `empty` items (`plant-vase-empty`, `plant-bowl-empty`, `plant-pot-empty`) owned from the start and not counted as spares in `canChange`; the vase arrangement `plant-vase-dried` is the vase's default. The four dried items moved to the vase; the migration in `parseDecor` moves an old plant-pot placement of a dried item to the vase (data-driven by `via`, tolerant of junk).
  - **The list** (d1): the bookshelf's one task is now "Change plants" (`swap-plant-shelf`, activity `pot-slots`, `activities/pot-slots.ts`, a copy of the clothes list's pattern: title PLANTS, rows VASE, BOWL, PLANT POT, up and down pick, left and right choose the plant and show it in the room, E sets, Escape leaves, no explanatory text). The vase and the bowl have `via: "plant-shelf"` and no task of their own; `canChange` answers for the three together. The box sits at the bottom so the shelf stays in view (top only if the player would be under it).
  - **Art** (`art/src`): `bookshelf.sprite` bare for the vase and bowl; `plant-vase-dried`, `plant-vase-empty`, `plant-bowl-empty` (2 px lower than the baked bowl), `plant-pot-empty`, cut from the old pixels (palette only, no text). Pixel check of old sprite versus bare shelf plus the two default items: 68 pixels differ, all in the bowl's rows (shift of 2).
  - **Plant care untouched**: `plant.ts`, the tick, nap and sleep, the care tasks, particles and `state-vars.ts` still use the plant pot's three variables; the empty pot freezes them like any still item.
  - **Sync**: no new save field, `placed` already travels whole with the newer side, `owned` is a union; a test merges both ways. `sync/merge.ts` needed no change.
  - **Golden frames**: all 48 main-room frames and all 14 sleep frames changed (2 more draw calls each, the vase and the bowl, plus the bowl's pixels). Re-recorded with `UPDATE_GOLDEN=1`; `public/social.png` regenerated with `npm run brand` (it shows the bookshelf).
  - **THINGS**: 4 more ALREADY HERE lines, not 3 (the vase arrangement is a real item too): 12 starting things, still one page at both views (224 x 208 holds exactly 12).
  - **Tests**: new `src/game/plant-pots.test.ts` (kinds, validation, empties, pool, saves, migration, sync merge, task and list, drawing); older decor tests updated for the empties, `via` and the vase (the "still item in the plant slot" tests now use the vase and the empty pot).
  - **Looked at in the running game** (dev server, headless Chrome, saves written for each state; 1x room, 8x shelf crops, list at 3x): default (same as before except the bowl 2 px lower), vase with pampas, empty vase, empty pot, lavender plus spider plant, pothos stage 4 and 5 (the vine crosses the bowl and books, accepted in the design), the list open with the vase, bowl and plant pot rows, left and right previews, and E applying them. Found and fixed: the empty vase kept two stem pixels from the sprays; the list box first covered the shelf.
  - **Checks**: `npm test` (176 files, 4193 passed), `npx tsc --noEmit`, `npm run build`, `npm run check:dist`, `npm run sprites` (leaves only the intended files changed).
  - Docs: `docs/decor.md` "What issue 182 built", `docs/text-review.md` "Plant pots (issue 182)".
  - Not done, on purpose: low plants (stage B), cut flowers and the clock (C), the sill and the tree square, the future drying idea.
