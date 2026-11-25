---
id: "179"
title: "Plant pots: three on the bookshelf, each for its own kind of plant"
short: "Plant pots design"
status: review
owner: marc + claude
depends_on: []
summary: "Design the three bookshelf pots (empty, dried arrangement, snake plant) as slots for different plant kinds, plus the window sill and floor trees."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Which kind of plant does each of the three bookshelf pots hold?"
    options:
      - "pot 1: houseplants (live, watered: snake plant, pothos, monstera, spider plant); pot 2: dried arrangements and cut flowers (flowers wilt and dry in place); pot 3: low and small plants (moss, succulents, a small bonsai), empty by default"
      - "pot 1: houseplants; pot 2: dried arrangements; pot 3: flowering plants (orchid, African violet, a tulip pot), empty by default"
      - "something else (the design proposes its own split)"
    recommendation: "pot 1: houseplants (live, watered: snake plant, pothos, monstera, spider plant); pot 2: dried arrangements and cut flowers (flowers wilt and dry in place); pot 3: low and small plants (moss, succulents, a small bonsai), empty by default"
    status: open
  - id: d2
    who: marc
    q: "Which kinds of plants should the window sill and the floor (the empty square next to the sofa, lamp and record player) hold, eventually?"
    options:
      - "the window sill: trailing or hanging plants and small herbs; the floor: small trees (a fiddle-leaf fig, a rubber plant, a potted palm); both later, after the three pots"
      - "the window sill: still items only for now (dried things and trinkets, as decided for issue 169); floor trees later"
      - "something else"
    recommendation: "the window sill: trailing or hanging plants and small herbs; the floor: small trees (a fiddle-leaf fig, a rubber plant, a potted palm); both later, after the three pots"
    status: open
  - id: d3
    who: marc
    q: "Which pots are live (they need watering and can droop) and which are still?"
    options:
      - "houseplants live; dried arrangements still; the third pot's low plants live but very slow and easy (a mist now and then), never punished"
      - "only the houseplant pot is live; every other pot is still"
      - "everything live"
    recommendation: "only the houseplant pot is live; every other pot is still (a live second plant is the large piece of engine work in docs/decor-expansion-design.md section 9, so do it later)"
    status: open
  - id: d4
    who: marc
    q: "Is the plant pot (the south one, today's plant slot) strictly for houseplants, so the existing dried items move to the vase?"
    options:
      - "strict: houseplants and the empty pot only; the four dried items (and the old saves that show one there) move to the vase; you can no longer park a dried item in the plant pot to pause the snake plant (the empty pot does it)"
      - "lenient: the plant pot also takes dried items, as today"
    recommendation: "strict: houseplants and the empty pot only; the four dried items (and the old saves that show one there) move to the vase; you can no longer park a dried item in the plant pot to pause the snake plant (the empty pot does it)"
    status: open
  - id: d5
    who: marc
    q: "Are the empty pots real items (EMPTY VASE, EMPTY BOWL, EMPTY POT, owned from the start) or empty slots?"
    options:
      - "items: no new engine; three more 'ALREADY HERE' lines on the THINGS page"
      - "empty slots with a bare-pot picture: needs engine work (a slot with a default that can also be empty)"
    recommendation: "items: no new engine; three more 'ALREADY HERE' lines on the THINGS page"
    status: open
  - id: d6
    who: marc
    q: "May the bowl be drawn 2 px lower than the baked bowl, so low plants get 4 clear rows above the rim instead of 2?"
    options:
      - "yes: a fresh game differs from today by those 2 pixels"
      - "no: the fresh room stays pixel for pixel the same and low plants are 2 rows tall"
    recommendation: "yes: a fresh game differs from today by those 2 pixels"
    status: open
  - id: d7
    who: marc
    q: "When cut flowers dry, do they become a separate keepsake item (DRIED TULIPS) or does the same item change its look?"
    options:
      - "the same item changes its look to dried, in place, as d1 says (issue 171 as written); a new bunch replaces it"
      - "a separate keepsake: the fresh bunch is replaced by a dried item you keep, and a new bunch can arrive again"
    recommendation: "the same item changes its look to dried, in place, as d1 says (issue 171 as written); a new bunch replaces it"
    status: open
  - id: d8
    who: marc
    q: "The floor trees: the shut-in square at col 8, row 7 (abs 128,112), with 16x16 small trees whose crown stays inside the tile?"
    options:
      - "yes: 16x16 small trees (potted palm, rubber plant, fiddle-leaf fig); a swap task on the record stand"
      - "a tall 16x32 tree (it hides the lamp, or sits behind it and shows only a trunk)"
      - "another square (the walk beside the lamp, which a tree would partly block)"
    recommendation: "yes: 16x16 small trees (potted palm, rubber plant, fiddle-leaf fig); a swap task on the record stand"
    status: open
  - id: d9
    who: marc
    q: "Swap tasks for the three pots: one each, or one that asks which pot?"
    options:
      - "one per pot (Change plant, Change vase, Change bowl), each only when there is a spare"
      - "one 'Change plants' that asks which pot first"
    recommendation: "one per pot (Change plant, Change vase, Change bowl), each only when there is a spare"
    status: open
  - id: d10
    who: marc
    q: "Does the window sill share the vase's and bowl's stock (dried and low plants and trinkets) rather than have a kind of its own?"
    options:
      - "share it, until live sill plants exist"
      - "its own kind of plant for the sill from the start"
    recommendation: "share it, until live sill plants exist"
    status: open
unverified:
  - "Nothing ran in a browser: the mockups are composed by a script from the real sprites and map, not by the game, and the HUD strip is not drawn."
  - "The low plants, the tulip looks and the tree in the mockups are stand-in art drawn in code, only to judge height and placement."
  - "Whether 4 clear rows above the bowl's rim is enough for a bonsai, and how three plants feel to look at, needs the real art."
  - "The reference photos were looked at but none shows the three pots, so the north-to-south order of vase, bowl and plant pot is read from the bookshelf sprite and Marc's description."
  - "Review: the claim that no reference photo shows the three pots was not re-checked (the photos are not in the repo and were not opened for this review)."
  - "Review: nothing ran in the game or a browser; the map, slot, draw-order and engine claims were checked by reading the code and by a flood fill of the map, and the mockups were regenerated with make.mjs (byte-identical)."
needs: [{who: marc, kind: decide, why: "Read docs/plant-pots-design.md and answer d4 to d10 (each has a recommended default)", since: 2026-11-24}]
---

## Goal
Marc (2026-11-24), clarifying the empty pot (issue 170): there are three pots already on the bookshelf in his apartment. By default one is empty (that is how it was in the photo of his apartment), another has a dried arrangement, and another has a snake plant. The idea: a different kind of plant for each pot. Dried arrangements (acquired from drying cut flowers, or delivered the regular way) go in one pot; houseplants in another; maybe something else in the third (more flowery plants? lower plants to balance things out? a pot filled with moss, bonsai; open to ideas). Then yet another type of plant eventually on the window sill, and maybe trees in the empty square next to the sofa, lamp and record player. This supersedes issue 170 (the empty pot) and shapes issue 171 (cut flowers). Today only one pot is a slot (`plant-shelf`, the snake plant overlay at (160, 52)); the other pots (and the baked vase and bowl) are part of the bookshelf sprite.

## Acceptance criteria
A DESIGN issue: `docs/plant-pots-design.md` (with mockups of the bookshelf, rendered with the game's own font, palette and sprites that the agent looks at itself) covering: what the bookshelf sprite and the map really contain today (read `art/src` for the bookshelf and the plant sprites, apartment.ts, the `plant-shelf` slot and overlay, and Marc's reference photos under reference-photos/ if present: read-only, never copied, named or described in the repo); the three pot slots (positions in pixels checked against the real sprites, what each looks like empty, which pot is which in the default room and why, how the baked art becomes slot art, the swap tasks per pot and where you stand, the draw order and the pothos overhang of issue 149 which hangs over the south face), the plant categories (a `plantKind` or item category and which items fit which pot: today's snake plant, pothos, monstera, spider plant, the dried arrangements, the six cut-flower and dried items, and new ideas for the third pot such as moss, succulents, cacti, a bonsai, with art counts and sizes for a first set), how cut flowers (issue 171) dry into the dried pot, the live/still split and the engine each needs (per-pot plant variables: the design note's section 9 L-sized work; what could be done first with the single live pot), the window sill and the floor-tree spot (find the real empty square next to the sofa, lamp and record player on the map; its pixel position, size and what it would need: a tall floor slot), saves and the migration of existing saves (a save with the snake plant in its pot stays the same), the effect on the item pool (issue 163: kinds), a size and staged build plan with each stage independently releasable, and questions beyond d1 to d3 as `decisions` with a recommended default. No code and no art in this issue. Issue 170 is superseded by this design.

## Progress log
- 2026-11-24 (planner): filed on main from Marc's clarification of the empty pot idea; issue 170 is superseded by it.
- 2026-11-24 (agent): started. Plan: read the decor notes and code, compose the real room at 8x, find the unreachable floor tile, write docs/plant-pots-design.md with mockups, add the questions as decisions d4 to d10, status review. No code or art in the game.
- 2026-11-24 (agent): done, in review. Files: `docs/plant-pots-design.md`, `docs/plant-pots-mockups/` (14 images, `make.mjs`, `lib.mjs`, `art.mjs`) and this file. Design: the bookshelf's baked vase and bowl become two slots (`pot-vase` at abs 160,16 and `pot-bowl` at 160,30) beside the existing plant pot (`plant-shelf`, 160,52); each holds one `plantKind` (dried and cut flowers, low plants, houseplants); each pot has an empty-pot item; only the plant pot is live; the fresh room is the same picture (the bowl 2 px lower, d6). The one unreachable floor tile (col 8, row 7, abs 128,112) is the tree square. Staged plan A to E in section 10. Engine claims (care code hard-wired to `plantDry` in `state.ts`, `tasks.ts`, `plant.ts`, `game.ts` line 578, particles) are in section 5. Looked at the reference photos only; nothing from them is in the repo. Not checked: anything in a browser; the stand-in art is not game art. d3 was answered on main after this branch was cut and the design follows that answer (low plants live, slow and easy; stage F). Questions beyond d1 to d3 are d4 to d10 above (defaults recommended); the planner should record them on main.
- 2026-11-24 (reviewer, independent): verdict CHANGES NEEDED (status left at review at the planner's request). Checked in the worktree at e330acb.
  Verified true: flood fill of MAIN_MAP leaves exactly one unreachable floor tile, col 8 row 7 (abs 128,112), whose neighbours are the lamp table (north), the record stand (east) and two wall tiles (west, south); col 9 row 6 (facing south) and col 10 row 7 (facing west) are open and face the record stand; the cube bookshelf can be faced from col 9 rows 3 and 4, col 11 rows 1 to 4 and col 10 row 5 only (rows 1 and 2 of col 9 are the desk). bookshelf.sprite rows (vase 4 to 13 with sprays 1 to 4, bowl 18 to 23, books 27 to 34, bare oak, face 53 to 63) and abs y values match; the bowl is 8 px wide and 6 rows; the existing vase items (dried, pampas, lavender, eucalyptus) have their last ink row on slot row 15. The care code is hard-wired at the six places in section 5 (state.ts:163, tasks.ts:212 and 415, plant.ts, game.ts:578, particles/feature.ts:102 and 103, state-vars.ts, main-room-frames.ts) and nowhere else in src. `fits`, `parseDecor` seeding, `frozenVars`, `isLive`, `look`, `plan`, `swapProblems`, `SWAP_PROMPT_SLOT` (only "rug-bed" today), `drawWorld` prop order (sorted by the piece's bottom, stable, MAIN_PROPS order), the tilemap prop position (`on` bounds plus `at`) and the pool derivation (`itemPool`: not start, not TEST, kind in ENCOUNTERS.pool.kinds) work as the design says; `checkLevel` and `validateDecorData` have no overlap check, so the vase and bowl slots can overlap. Overhang numbers match FAMILIES; the monstera stage 4 leaves start at y 44. A fresh snake-plant save is unchanged (no `placed` entry for plant-shelf). Mockups: all 14 viewed; they show what the doc says; sizes 320x192 and 224x208 are right and the narrow camera range 0 to 80 is right (304 - 224). `npm run issues:check -- --validate` passes (214 valid; the 145-character summary warning on 179 existed before). d4 to d10 are open with recommended defaults; d1 to d3 are untouched on the branch. Only the design note, the mockups folder and this file changed; nothing in the repo comes from reference-photos/, no brand or recent artist names.
  Changes needed:
  - [ ] **d3 was answered on main after this branch was cut** (merge-base 90d3bd1; main has "179: answered d1/d2/d3"). Marc's d3 answer is the first option: houseplants live, dried still, and the low plants in the bowl LIVE but very slow and easy (a mist now and then, never punished). The design assumes the recommended default instead (only the plant pot live): line 9, section 3 table ("Live" column), section 5 final paragraph (lines 136 to 138), section 10 "Later: live bowl" row, section 11 and the d3 cross-references. Update the design to the answered d3: put the slow, stage-less live low plant (the clock, one mist task, one sprite pair, M by the design's own estimate) into the staged plan as a real stage, say what the bowl items need (which low plants are live, art pairs), and re-check "still bowl items" statements. Also change `needs` to ask for d4 to d10 only, and rebase or merge main so the issue file picks up the d1 to d3 answers (do not edit them).
  - [ ] **Line 66 is wrong:** "each offered only when a spare item fits that pot (`Decor.canChange`), so a fresh game shows nothing new". With the empty items owned from the start (d5's recommendation) `canChange` is true on a fresh game for the plant pot (EMPTY POT is owned and in the inventory) and the vase (EMPTY VASE), and false only for the bowl (its one owned fit is the item shown). `canChange` is "an owned fitting item not shown anywhere, or an emptiable slot showing something" (decor.ts:415 to 417, docs/decor.md:30). So a fresh game would show "Change plant" and "Change vase" on the bookshelf (and the stage A row "After it, the game looks the same" and the crowding count in line 67 need the same correction), and the existing "fresh game shows no swap task" tests will change. Say this plainly, decide whether it is wanted (it is how a player first finds the empty pots) and put it in d5 or d9, or give the empties a way not to count.
  - [ ] Line 50: "The bowl slot cannot start lower to clear the vase slot" is not true. A bowl slot at y 32 (rows 16 to 31 of the sprite, items drawn the same) touches neither the vase slot (y 16 to 31) nor the plant slot (y 52); the books are overlapped either way, which the same paragraph says is harmless. The 48 + 8 rows arithmetic does not hold. Fix the reasoning (the overlap is optional, not forced; the 2 px nudge in d6 is the real choice).
  - [ ] Line 36 (and docs/decor.md:72 it copies): the pothos stage 4 vines fill 5 rows below the slot (ink rows 16 to 20, y 68 to 72), not 12 of 16; stage 5 fills 11 (last ink row 42, so y 78, not 79). "12 of the 16" is the room the sprite is allowed (the shelf ends at y 79). Reword so a future artist is not misled.
  - [ ] Section 8, the migration: "the plant pot then shows the snake plant with the stage it had when the dried item was put there" is only true if the snake plant was the live plant before. If a pothos (stage up to 5) was swapped for the dried item, the plant vars stay frozen at the pothos's values (swap-decor.ts:95 only resets live to live), so the migrated snake plant shows the clamped stage 3 (`look` clamps; `settlePlant` only fixes the stage on the next plantGrowth change) and the old dryness. State this edge and require a test for it (a save with pothos stage 5 and pampas in the pot).
  - [ ] Section 4, d7: a DRIED TULIPS keepsake that is not `how: "start"` joins the shop pool (`itemPool`) and a florist could sell the player a keepsake they made; say what its `how` is (or that it is excluded), as section 9 does for the other new items.
  - [ ] Small: mockup 14 is never referenced in the doc; lines 15 and 231 say what the reference photos do not show (keep it to "looked at, nothing used"); the doc's closing line uses a ~/Dev/... path (fine, matches other docs).
  Could not verify: anything in a browser (no game run); that no reference photo shows the three pots; that a camera follow really reaches x 80 (only the range was checked).
- 2026-11-24 (agent): review round 1 changes: followed Marc's d3 answer from main (live slow bowl plants, new stage F); fixed the fresh-game swap prompt claim (empty items need an `empty` flag so `canChange` ignores them); fixed the bowl-slot reasoning and the pothos vine rows; stated the migration edge and the keepsake pool rule; d7 now defaults to in place as Marc's d1 wording says; mockup 14 referenced. d1 to d3 here are untouched; main has them answered.
