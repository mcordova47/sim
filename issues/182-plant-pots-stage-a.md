---
id: "182"
title: "Plant pots, stage A: the three pots on the bookshelf"
short: "Three pots (stage A)"
status: todo
owner: marc + claude
depends_on: ["179"]
summary: "Make the bookshelf vase and bowl real slots next to the plant pot, with kinds, empty items and a save migration."
kind: build
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
