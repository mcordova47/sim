---
id: "179"
title: "Plant pots: three on the bookshelf, each for its own kind of plant"
short: "Plant pots design"
status: done
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
    status: answered
    answer: "pot 1: houseplants (live, watered: snake plant, pothos, monstera, spider plant); pot 2: dried arrangements and cut flowers (flowers wilt and dry in place); pot 3: low and small plants (moss, succulents, a small bonsai), empty by default"
    by: marc
    on: 2026-11-24
  - id: d2
    who: marc
    q: "Which kinds of plants should the window sill and the floor (the empty square next to the sofa, lamp and record player) hold, eventually?"
    options:
      - "the window sill: trailing or hanging plants and small herbs; the floor: small trees (a fiddle-leaf fig, a rubber plant, a potted palm); both later, after the three pots"
      - "the window sill: still items only for now (dried things and trinkets, as decided for issue 169); floor trees later"
      - "something else"
    recommendation: "the window sill: trailing or hanging plants and small herbs; the floor: small trees (a fiddle-leaf fig, a rubber plant, a potted palm); both later, after the three pots"
    status: answered
    answer: "the window sill: trailing or hanging plants and small herbs; the floor: small trees (a fiddle-leaf fig, a rubber plant, a potted palm); both later, after the three pots"
    by: marc
    on: 2026-11-24
  - id: d3
    who: marc
    q: "Which pots are live (they need watering and can droop) and which are still?"
    options:
      - "houseplants live; dried arrangements still; the third pot's low plants live but very slow and easy (a mist now and then), never punished"
      - "only the houseplant pot is live; every other pot is still"
      - "everything live"
    recommendation: "only the houseplant pot is live; every other pot is still (a live second plant is the large piece of engine work in docs/decor-expansion-design.md section 9, so do it later)"
    status: answered
    answer: "houseplants live; dried arrangements still; the third pot's low plants live but very slow and easy (a mist now and then), never punished"
    by: marc
    on: 2026-11-24
  - id: d4
    who: marc
    q: "Is the plant pot (the south one, today's plant slot) strictly for houseplants, so the existing dried items move to the vase?"
    options:
      - "strict: houseplants and the empty pot only; the four dried items (and the old saves that show one there) move to the vase; you can no longer park a dried item in the plant pot to pause the snake plant (the empty pot does it)"
      - "lenient: the plant pot also takes dried items, as today"
    recommendation: "strict: houseplants and the empty pot only; the four dried items (and the old saves that show one there) move to the vase; you can no longer park a dried item in the plant pot to pause the snake plant (the empty pot does it)"
    status: answered
    answer: "strict: houseplants and the empty pot only; the four dried items (and the old saves that show one there) move to the vase; you can no longer park a dried item in the plant pot to pause the snake plant (the empty pot does it)"
    by: marc
    on: 2026-11-24
  - id: d5
    who: marc
    q: "Are the empty pots real items (EMPTY VASE, EMPTY BOWL, EMPTY POT, owned from the start) or empty slots?"
    options:
      - "items: no new engine beyond an `empty` flag so they do not count as spares (a fresh game shows no new prompt; an empty pot is reachable once the first real spare arrives); three more 'ALREADY HERE' lines on the THINGS page"
      - "empty slots with a bare-pot picture: needs engine work (a slot with a default that can also be empty)"
    recommendation: "items: no new engine beyond an `empty` flag so they do not count as spares (a fresh game shows no new prompt; an empty pot is reachable once the first real spare arrives); three more 'ALREADY HERE' lines on the THINGS page"
    status: answered
    answer: "items: no new engine beyond an `empty` flag so they do not count as spares (a fresh game shows no new prompt; an empty pot is reachable once the first real spare arrives); three more 'ALREADY HERE' lines on the THINGS page"
    by: marc
    on: 2026-11-24
  - id: d6
    who: marc
    q: "May the bowl be drawn 2 px lower than the baked bowl, so low plants get 4 clear rows above the rim instead of 2?"
    options:
      - "yes: a fresh game differs from today by those 2 pixels"
      - "no: the fresh room stays pixel for pixel the same and low plants are 2 rows tall"
    recommendation: "yes: a fresh game differs from today by those 2 pixels"
    status: answered
    answer: "yes: a fresh game differs from today by those 2 pixels"
    by: marc
    on: 2026-11-24
  - id: d7
    who: marc
    q: "When cut flowers dry, do they become a separate keepsake item (DRIED TULIPS) or does the same item change its look?"
    options:
      - "the same item changes its look to dried, in place, as d1 says (issue 171 as written); a new bunch replaces it"
      - "a separate keepsake: the fresh bunch is replaced by a dried item you keep, and a new bunch can arrive again"
    recommendation: "the same item changes its look to dried, in place, as d1 says (issue 171 as written); a new bunch replaces it"
    status: answered
    answer: "for now that's fine; i have this idea for the future for the flowers to sit on the desk or something and drying the flowers is an active choice, which takes some time and then you collect the dried flowers and can put them in the pot; you can receive the same bunch again, but i guess you can't dry the same arrangement a second time"
    by: marc
    on: 2026-11-24
  - id: d8
    who: marc
    q: "The floor trees: the shut-in square at col 8, row 7 (abs 128,112), with 16x16 small trees whose crown stays inside the tile?"
    options:
      - "yes: 16x16 small trees (potted palm, rubber plant, fiddle-leaf fig); a swap task on the record stand"
      - "a tall 16x32 tree (it hides the lamp, or sits behind it and shows only a trunk)"
      - "another square (the walk beside the lamp, which a tree would partly block)"
    recommendation: "yes: 16x16 small trees (potted palm, rubber plant, fiddle-leaf fig); a swap task on the record stand"
    status: answered
    answer: "yes: 16x16 small trees (potted palm, rubber plant, fiddle-leaf fig); a swap task on the record stand"
    by: marc
    on: 2026-11-24
  - id: d9
    who: marc
    q: "Swap tasks for the three pots: one each, or one that asks which pot?"
    options:
      - "one per pot (Change plant, Change vase, Change bowl), each only when there is a spare"
      - "one 'Change plants' that asks which pot first"
    recommendation: "one per pot (Change plant, Change vase, Change bowl), each only when there is a spare"
    status: answered
    answer: "maybe this could be a similar slot mechanism to outfits? then the menu would work the same way? another option is just one \"change plants\" option that just puts the plant in the appropriate place; i don't feel strongly, but it would be nice to avoid the top-level list growing too large"
    by: marc
    on: 2026-11-24
  - id: d10
    who: marc
    q: "Does the window sill share the vase's and bowl's stock (dried and low plants and trinkets) rather than have a kind of its own?"
    options:
      - "share it (still low plants fit both bowl and sill; live ones fit the bowl only), until live sill plants exist"
      - "its own kind of plant for the sill from the start"
    recommendation: "share it (still low plants fit both bowl and sill; live ones fit the bowl only), until live sill plants exist"
    status: answered
    answer: "that sounds fine, with a follow-up to give it a special kind (herbs or flowers or something?)"
    by: marc
    on: 2026-11-24
unverified:
  - "Nothing ran in a browser: the mockups are composed by a script from the real sprites and map, not by the game, and the HUD strip is not drawn."
  - "The low plants, the tulip looks and the tree in the mockups are stand-in art drawn in code, only to judge height and placement."
  - "Whether 4 clear rows above the bowl's rim is enough for a bonsai, and how three plants feel to look at, needs the real art."
  - "The reference photos were looked at but none shows the three pots, so the north-to-south order of vase, bowl and plant pot is read from the bookshelf sprite and Marc's description."
  - "Review: the claim that no reference photo shows the three pots was not re-checked (the photos are not in the repo and were not opened for this review)."
  - "Review: nothing ran in the game or a browser; the map, slot, draw-order and engine claims were checked by reading the code and by a flood fill of the map, and the mockups were regenerated with make.mjs (byte-identical)."
  - "Review round 2: nothing ran in a browser; the reference photos were not opened; the migration edge, canChange, pothos rows and itemPool were checked by reading code and sprites only."
  - "Review round 3: nothing ran in a browser; two of the reference photos were opened read-only and neither shows the three pots, the rest were not opened, so the claim for every photo is not proven; the stage F rule for a live low plant on the sill was read, not tested."
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
- 2026-11-24 (reviewer 2, independent, round 2): verdict CHANGES NEEDED (status left at review, as in round 1). Checked in the worktree at 917cb54. Main's d1 to d3 answers read with git show; this branch's d1 to d3 stay open on purpose.
  Round-1 findings verified fixed: d3 follow-through (stage F, live slow bowl plants, section 3 table, section 5 table and closing paragraph, section 10 row F, section 11 intro) matches Marc's answer; `needs` asks d4 to d10 only; line 36 pothos rows are right (stage 4 ink rows 16 to 20 = y 68 to 72, 5 rows below the slot; stage 5 last ink row 42 = y 78); the migration edge (section 8) is right against swap-decor.ts:95 (reset only when live replaces live) and `look`'s clamp (snake plant has 4 stages, so stage 3); the keepsake pool rule (`tags: ["keepsake"]` skipped by `itemPool`) is right against encounter-draw.ts:20; the `canChange` fix is described correctly (decor.ts:415 to 417) and mockup 14 is now referenced. Section 5 line refs (state.ts:163, tasks.ts:212 and 415, plant.ts, game.ts:578, particles/feature.ts:103, state-vars.ts) are right. Mockups 3 and 14 viewed again; they match the text (the pothos vine crosses the bowl; the monstera clears the bowl and covers the books as it does today). `npm run issues:check -- --validate`: 214 valid.
  Changes needed:
  - [ ] **Line 55 still argues the overlap is the price of 4 clear rows, and it is not.** A bowl slot at y 32 with the bowl drawn 2 px lower (rim at slot row 4, y 36) also has 4 clear rows (y 32 to 35) and touches neither the vase slot nor anything else. The sentence compares "slot at y 32, bowl not nudged (2 rows)" with "slot at y 30, bowl nudged (4 rows)", which mixes two choices. Say the rows come from the nudge alone (d6) and either slot y works; pick y 32 (no shared rows) unless there is a reason for y 30, and fix the table (line 47) and line 50 to match.
  - [ ] **The `empty: true` fix leaves the empty items unreachable on a fresh game** (lines 64, 66, 92 and the stage A row, line 205 "you can empty any pot"). With empties not counting as spares, "Change plant", "Change vase" and "Change bowl" appear only when a real spare is owned; under d4 strict the plant pot's first spare is a second houseplant (a gift), so for a long time nobody can reach EMPTY POT (and d4's "the empty pot pauses the snake plant" does not work for a fresh game). Say this plainly and decide (a) accepted, empties appear once any spare exists, (b) the empties count as spares (then say that a fresh game shows two new prompts and the swap tests change), or (c) another rule; put it in d5 or d9.
  - [ ] **Stage F against the sill (d10, section 6).** Low plants fit the sill (`plantKinds: ["dried", "low"]`) and are shared stock, but in stage F they become live on the bowl's clock and mist task (`liveSlot` names the bowl). A live low plant moved to the sill has no clock variable, no mist task and no wilted look there. State the rule: live low plants fit the bowl only until the live sill exists, or the clock follows the item and not the slot (and say what that costs).
  - [ ] Size inconsistency: line 153 calls a live sill "an L piece ... the same work as a live bowl" while the live bowl is M (lines 140 and 210) and the "Later: live sill" row (211) says M to L. Make them agree.
  - [ ] Nit: line 41 and 72 say the stage 5 vine is "y 36 to 51"; the ink there starts at sprite row 2 (y 38). Say "within y 36 to 51" or give 38.
  Could not verify: anything in a browser; the reference photos (not opened); that a fresh game's swap tests are the only ones `empty` changes (the test files were not read).
- 2026-11-24 (agent): review round 2 changes: the bowl slot is now at abs (160, 32) with no overlap (same picture; the nudge alone gives the 4 rows); stated that empty items are unreachable until a real spare exists (d5); live low plants fit the bowl only (d10); sill sizes made consistent; pothos vine start corrected to y 38. Two review rounds done; these last fixes are not re-reviewed.
- 2026-11-24 (reviewer 3, independent, round 3): verdict APPROVE. Checked in the worktree at a7bc92b; re-running `make.mjs` leaves git status clean (mockups byte-identical); the branch changes only docs/plant-pots-design.md, docs/plant-pots-mockups/ and this file.
  Round-2 fixes, each re-checked: (1) the bowl slot is at abs (160,32), sprite rows 16 to 31, no overlap with the vase slot (rows 0 to 15) or the plant slot (y 52); the 4 clear rows come from the 2 px nudge alone (rim at slot row 4 = y 36; the baked rim is sprite row 18 = y 34; art/src/bookshelf.sprite: vase base row 13, bowl rows 18 to 23 and 8 wide, books 27 to 34, bare oak 35 to 52, south face 53 to 63); table, the paragraph under it and d6 agree. (2) Empties not counted as spares: `canChange` (decor.ts:415 to 417) is "an owned fitting item not displayed, or emptiable and held" and `canBeEmpty` is "no default" (issue 151), so pots that have defaults need the items route plus the `empty` flag (a real S change); the note now says plainly that EMPTY POT and EMPTY VASE are unreachable until a real spare exists (first gifts: pothos day 21, pampas day 24, delivery-checkpoints.ts:28 and 29) and keeps the alternative in d5. (3) d10: live low plants fit the bowl only. (4) Live sill sizes agree (M to L at both places; live bowl M). (5) The vine is now "y 38 to 51".
  Other criteria, my own evidence. Pot positions: vase (160,16), bowl (160,32), plant pot (160,52) agree with MAIN_PROPS (plant on H at 0,36) and decor-data.ts:136; H is col 10 rows 1 to 4 on MAIN_MAP. Plant care hard-wired by name at: state.ts:163 to 164 (tick), tasks.ts:212 (nap) and 415 (sleep) and tasks.ts:32 to 36 (`liveSlot: 'plant-shelf'`), plant.ts (DROOPING, THIRSTY, WATER_*, settle), game.ts:578, particles/feature.ts:102 and 103, state-vars.ts:26 to 28, plus main-room-frames.ts:24 to 28 and a comment in main.ts; nowhere else in src outside tests. Unreachable tile: MAIN_MAP row 6 "#GSSSSSSL..." and row 7 "########.R..": col 8 row 7 is floor with the lamp table north, the record stand east, walls west and south = abs (128,112); col 9 row 6 and col 10 row 7 are open and face the stand. The bookshelf is faceable from col 9 rows 3 and 4, col 11 rows 1 to 4 and col 10 row 5. A 16x32 tree in that column would cover the lamp table at (128,96), so the rejection holds. Migration (section 8) matches parseDecor (an unfit placement is dropped and the default shows) and the frozen-vars and clamp edge. `plantKind`/`plantKinds` does not clash with the id-starts-with-kind rule. Pool: itemPool (encounter-draw.ts:20) skips only `how: "start"` and test items, so the keepsake tag, `how: "start"` empties and "no item before its slot" are right. Overhang numbers match decor-data.ts:127 to 129. Staged plan A to F: dependencies hold (C needs A, F needs B and C, D waits for 167 and 169). Decisions: d1 to d3 here equal main's except `status: open` against main's answered (left alone on purpose); d4 to d10 are present with recommendations equal to their first options. Rules: no brand or recent artist names, nothing described from a photo; two reference photos opened read-only, neither shows the three pots.
  Mockups: I viewed 01, 02, 03, 08, 09, 11 and 14. 01 and 02 show the real room and the 16x64 shelf with the labelled parts as the note says. 03 has seven panels (default; pampas, moss, spider; pothos hanging with its vine across the bowl and books; monstera crown clearing the bowl; fresh, wilting and dried tulips). 08 shows four stand-in bowl plants that sit low with room above. 09 shows four items on the lower sill glass. 11 shows the empty tile, the 16x16 tree, and the 16x32 tree over and behind the lamp as described. 14 shows everything at once and reads clearly. The other seven come from the same script, byte-identical on regeneration, with the right sizes (320x192, 224x208).
  Non-blocking nits (nothing to redo):
  - The bowl slot lies over the books for 5 rows (y 43 to 47), not "four rows (y 44 to 47)" (section 2).
  - Two places say "no new engine" for the empty items; stage A and d5 add the `empty` flag (S). The d4 and section 3 wording "the empty pot does it" lacks the caveat that empties are unreachable until a real spare exists.
  - Stage F: say how a live low plant is kept off the sill (the item's own `slots` list, which `fits` already reads) and what happens to a still low plant already on the sill when its item turns live.
  - Issue 171 and docs/decor-expansion-design.md (section 2 and the line about `plant-shelf` under "New slots") still put cut flowers in `plant-shelf` on `plantDry`; this note moves them to the vase with its own clock, and 171's "golden frames unchanged" will not hold after stage A (the 2 px bowl). The planner should update 171 on main after Marc answers d4 to d7.
  Could not check: anything in a browser; the other reference photos; whether `empty` changes only the fresh-game swap tests (tests not read).
