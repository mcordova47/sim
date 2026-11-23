---
id: "148"
title: "Decor expansion: design note"
short: "Decor expansion design"
status: done
owner: claude
depends_on: []
summary: "A design note for ten decor ideas: where each goes, what it costs, and the order to build them."
kind: design
decisions:
  - id: d1
    who: marc
    q: "Decor design (148, Q1): do the art-free engine work first (empty-slot option, worn outfits, takeout) before drawing anything?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d2
    who: marc
    q: "Decor design (148, Q2): desk right corner for the first trinket, desk left corner kept for clutter (042), a wall shelf above the bookshelf later?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d3
    who: marc
    q: "Decor design (148, Q3): worn outfits first, changed at the nightstand, poses stay in everyday clothes for now?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes, but treat the pose pop as a bug and file an issue (150)"
    by: marc
    on: 2026-11-23
  - id: d4
    who: marc
    q: "Decor design (148, Q4): cut flowers wilt at 3 game days and dry at 5 into a lasting arrangement, and a free task freshens them?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d5
    who: marc
    q: "Decor design (148, Q5): the coffee apparatus changes the task name and prompt, not the pay or the held-mug picture?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes; but some apparatus (percolator, moka pot, briki) may be triggered from the stove, so think about that (d13)"
    by: marc
    on: 2026-11-23
  - id: d6
    who: marc
    q: "Decor design (148, Q6): takeout ordered at the nightstand phone, eaten at the table for 40 points, +15 energy, +5 mood, no dishes, a container to recycle, no cold timer?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d7
    who: marc
    q: "Decor design (148, Q7): one rug size (64x32) at cols 3-6, rows 3-4, changed at the sofa?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d8
    who: marc
    q: "Decor design (148, Q8): instruments display only for now (a mini keyboard); playable ones later, kalimba first?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d9
    who: marc
    q: "Decor design (148, Q9): the worry doll is plain WORRY DOLL in the list, the Spanish name only in its note once the accent is seen in the list?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes"
    by: marc
    on: 2026-11-23
  - id: d10
    who: marc
    q: "Decor design (148, Q10): a second plant slot (window sill) holds still items only at first?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "yes (still items only at first); there is already an empty pot on top of the bookshelf; a larger floor plant next to the sofa is a future idea"
    by: marc
    on: 2026-11-23
  - id: d11
    who: marc
    q: "Decor design (148, Q11): replacement furniture only as gifts, one piece at a time, record stand first?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: open
  - id: d12
    who: marc
    q: "Decor design (148, Q12): generic noun names for items (finger skateboard, pod machine, plunger-style press), no brands?"
    options:
      - "yes"
      - "no"
    recommendation: "yes"
    status: answered
    answer: "makes sense, but plunger-style press sounds too similar to a french press (assuming it's supposed to be aeropress?) so let's think about other names: air press? pneumatic press? some fake brand name?"
    by: marc
    on: 2026-11-23
  - id: d13
    who: marc
    q: "Decor design (148, Q13, from Q5): stovetop coffee gear (percolator, moka pot, briki) is used at the stove, not the table. How should that work?"
    options:
      - "two coffee stations: a table slot and a stove slot; each apparatus fits one, the task is offered where its apparatus sits (the stove slot starts empty)"
      - "one slot on the table only; stovetop pots are just a different look and name, still made at the table"
      - "stovetop pots replace the table dripper and move the task to the stove while chosen"
    recommendation: "two coffee stations: a table slot and a stove slot; each apparatus fits one, the task is offered where its apparatus sits (the stove slot starts empty)"
    status: answered
    answer: "two coffee stations: a table slot and a stove slot; each apparatus fits one, the task is offered where its apparatus sits (the stove slot starts empty)"
    by: marc
    on: 2026-11-23
unverified:
  - "How the ideas look and feel in the game is unchecked: nothing is built; the Ñ accent in a 9 px swap-list row and a 64x32 rug in the THINGS grid cell were reasoned from the code, not rendered."
  - "Pixel positions come from my own render of the map and sprites and from reading the sprite files; the reviewer re-checks them."
  - "Review 2026-11-23: where the trinket examples (goose egg, worry doll, alebrijes, finger skateboard) came from is unverified: they appear only in this note; reference-photos/ was not opened. Issue 147's content (another worktree) was not read, so the 147 dependencies are unchecked. Every play-feel claim (dried flowers look pretty, takeout balance, the empty shelf and hook reading as quiet) is unverified: nothing is built."
  - "Review 2 2026-11-23: how anything looks or plays is still unverified (nothing is built); issue 147 not read; the trinket example origin is the author's statement only; reference-photos/ not opened. The sound feature's lookup of the record stand was not found in src (only the particle emitter at config.ts:1569 and the task at tasks.ts:239 were)."
  - "Review 3 2026-11-23: how anything looks or plays is unverified (nothing is built). The trinket examples' origin is the author's statement only; the raccoon in a can is in decor.md's ideas backlog (Marc's text, which cites a photo), and reference-photos/ was not opened. The Ñ accent in a swap-list row was not rendered."
---

## Goal
Marc (2026-11-23) wants many more decor options. Write `docs/decor-expansion-design.md`: for each of ten ideas (an empty pot, live cut flowers, trinkets, instruments, clothes, coffee apparatus, a rug, replacement furniture, a second plant slot, takeout) say where it shows up (checked against the real maps and sprites), what the engine needs, the art needed, the quiet-collecting risks, a size and any open question with a recommended default. Then a build order, a table of the new slots and a short question list for Marc. No code and no art. The plants and dried arrangements themselves are issue 147 and are not designed here.

## Acceptance criteria
- Every idea has its own section answering the questions above, with pixel positions and sizes that match `apartment.ts` and the sprites in `art/src`, and engine claims that match `src/game`.
- A recommended order of build issues with sizes and dependencies, a table of all new slots, and a list of questions for Marc with recommended defaults.
- `docs/decor.md` has a one-line pointer to the note; nothing else outside this issue file and the new doc is edited.
- `npm run issues:check -- --validate` passes; an independent review with a written entry.

## Progress log
- 2026-11-23 (claude): plan: read decor.md, the inventory, art and floor notes, the engine (decor-data, decor, deliveries, apartment, tasks, game draw order) and the room sprites; render the main room from the real map and sprites to check positions; write docs/decor-expansion-design.md and a one-line pointer in docs/decor.md. reference-photos/ is not read or described.
- 2026-11-23 (claude): written. Files: docs/decor-expansion-design.md (new), docs/decor.md (one pointer line at the top), this issue file. Ten sections, shared engine pieces P1 to P8, a slot table, an ordered build plan (A to P) and 12 questions with recommended defaults. Checked by a render of the main room composed from the real map and sprites (outside the repo), and by reading decor-data.ts, decor.ts, deliveries.ts, tasks.ts, apartment.ts, poses.ts, game.ts (draw order), outfits.ts and the sprite files. `npm run issues:check -- --validate` passes (181 files valid, warnings are on other issues). Not checked: anything about how it plays (nothing is built). reference-photos/ was not read or described.
- 2026-11-23 (reviewer, independent): Review. Verdict: CHANGES NEEDED. I measured the sprites in art/src with my own script (desk, table, table-plate, nightstand, window, mug, bookshelf, poses) and parsed MAIN_MAP; I ran taskSpots and Grid from the real code through vitest (scratch file outside the repo). PASS: every rectangle in the note lies on the tiles and pixels it says. Rug (48,48,64x32) is eight floor tiles, no pose or piece touches it; trinket-desk (140,17) is all tan in desk x 44-59, y 1-16 (the only overlap is one empty row, abs y 32, with the typing pose rectangle); coffee-table (62,18) is on T; the wall shelf (160-208, y 0) is three `#` back-wall tiles with floor at (11,1) and (12,1); the sill (288,112) is on the lower W; sizes of every sprite and piece match. Numbers PASS: 12 minute day, 30 s hour, droop 96, maxQueued 20, every task's points, durations and effects, 36 outfit sprites, desk has seven tasks. Scope PASS (3 files), issues:check --validate PASS (181 valid), public-repo names PASS (no brands or personal names in the note). FAIL, to fix (checklist):
  - [ ] Section 8 and question 11: the desk chair is NOT "no pose, easiest". `player-type-desk` (poses.ts:46, 16x32 at desk local 32,16 = abs 128-143, 48-63) is exactly the chair tile and draws its own chair (art-style.md:98; desk-chair.sprite header). A replacement chair would flip back to the old chair while typing, like clothes. Re-rank the order and say what the chair needs (redo the pose, or accept the pop).
  - [ ] Section 5 and slot `hook-door`: the hook's only stand tile (10,8) is the package tile, which is a static solid: tilemap.ts:154-158 keeps `blockedWhen` solids in `level.solids`, grid.ts ignores blockedWhen, plan-checks.ts:30 builds the Grid from `level.solids`. I confirmed taskSpots gives collect-delivery stands only (10,7) and (11,8). So `swap-hook-door` would have no spot and the existing test apartment.test.ts:96-107 ("can be reached on foot and faced") fails. The note says "nothing is blocked"; it needs a different place, or a plan-checks change listed under the engine needs. Also tilemap.ts:200 throws for a legend slot with no default sprite, so P1 must name tilemap.ts (hook, and any map piece with an empty default).
  - [ ] P6 / build step B (slot `worn`, no piece in the room): decor.test.ts:53-58 requires every main-room slot to be found among appearances or props with an equal area. A drawn-nowhere slot fails it, and decor.test.ts:47 pins the exact slot list. Say what changes.
  - [ ] Section 2: "Once dried, `isLive` is false" is not available. `Decor.isLive(slotId)` and `frozenVars()` (decor.ts:168-182, used at game.ts:184 and game.ts:236) take no state, so they cannot know a bunch has dried. State-aware versions are an unlisted engine need (it affects 147 too).
  - [ ] Section 2: "put a new item in and the live-replaces-live rule sets the count to 0: fresh" holds only if the old item was live. swap-decor.ts:88-91 resets only when `wasLive && isLive`; replacing a DRIED bunch with a new one resets nothing, so the new flowers arrive at the old count (120 or more) already wilted or dried. This is the same catch the note raises in section 1, but section 2 states the opposite and K does not depend on that fix.
  - [ ] Section 7 and the THINGS claim: the cell is not 52x24. inventory-draw.ts:15,38-40 gives (320-12)/5 = 61 wide on the 320 view and (224-12)/4 = 53 on the narrow one, 24 tall. The conclusion (a 64x32 rug does not fit and drawSprite crops only rows) stands; correct the number.
  - [ ] Build plan: P3 (item looks by state) is needed by N and P but is not a step of its own, so "needs P3" points at nothing; J lists "A, 147" but the sill slot takes kind `trinket` (needs C) and section 3 sizes the sill M while J says S; G ships "first items" in a table that still says "Make pour-over coffee" (section 6 admits the name is wrong), so G should ship only the default item or merge with G2; the preamble "a fresh game is unchanged" contradicts the "visible on a fresh game: yes" rows D, I and L.
  - [ ] Smaller engine misstatements: tasks.ts:199 `nap` adds `NAP.hours` to plantDry, only `sleep` uses `addSkipped` (tasks.ts:377), so section 2's "nap or sleep ... addSkipped" is half right; the guitar pose does not "replace the piece" (poses.ts:49-55; no pose sets `replacesPiece`, poses.ts:63-70, so the bed row's mention is wrong too); a nylon guitar already has a voice (config.ts:1103-1106), so "plus a new timbre" is not needed for `guitar-nylon`; the record stand is found by a particle emitter by sprite name (config.ts:1569), not by the sound feature.
  - [ ] Takeout gaps: P7 does not say that `parseDeliveries`/`load`/`collect` assume decor ids (deliveries.ts:60-88, 213-215, 163); and opening the meal while a cooked plate is already on the table (plate 1; `eat-dinner` has no plate requirement, tasks.ts:215) is not handled. Three `swap-trinket-shelf-N` tasks on one shelf piece would be three identical Tab entries (SWAPS in tasks.ts:342-345); say how that is avoided.
  Unverified: how any of it looks or plays; issue 147's content; where the trinket examples came from. The reviewer did not open reference-photos/.
- 2026-11-23 (claude): round 2, all nine review items addressed in docs/decor-expansion-design.md: (1) chair re-ranked (tied to the typing pose; the record stand is first); (2) the hook dropped, with the reason (its only stand tile is a static solid); (3) P6 now says the two decor tests change; (4) and (5) flowers: state-aware isLive/frozenVars and the reset rule for a new bunch replacing a dried one stated; (6) THINGS cell 61 wide (53 narrow); (7) P3 is its own step, J needs C and is M, G ships only the default item, the preamble says which steps change a fresh game; (8) nap, pose, nylon guitar voice and record stand statements corrected; (9) takeout: P7 lists the deliveries code that assumes decor ids, the existing-plate case is handled, and the shelf's three identical swap tasks are flagged. The trinket examples (alebrijes, telescope, finger skateboard, goose egg, worry doll, raccoon in a can) came from Marc's request text, not from any photo.
- 2026-11-23 (reviewer 2, independent): Review of round 2. Verdict: CHANGES NEEDED (small leftovers). I re-measured with my own script: desk corners x 3-18 and x 44-59, y 2-14 are all tan (`9`); window glass is local x 10-15; table dripper and mug positions match; MAIN_MAP gives rug tiles (cols 3-6, rows 3-4) all floor, wall strip row 0 cols 10-12 is `#` with floor at (11,1), (12,1), sill (288,112) on the lower `W` rows 6-7 with floor col 17. PASS and checked against code: isLive/frozenVars take no state (decor.ts:168-182, game.ts:184, 236); the reset only when `wasLive && isLive` (activities/swap-decor.ts:84, 92); decor.test.ts pins slots (line 47) and the main-room match (53-58); the typing pose is on the chair tile (poses.ts:46); no pose sets `replacesPiece` in use; nap adds NAP.hours (tasks.ts:199), sleep uses addSkipped (tasks.ts:376); nylon guitar has a voice (config.ts:1103-1106); record-stand emitter by sprite name (config.ts:1569); tilemap.ts:200 default-sprite throw; deliveries load (deliveries.ts:213) and collect (:163) assume decor ids; eat-dinner needs only NO_CLEAN_PLATES, i.e. dishes (tasks.ts:93, 215); SWAPS makes one task per slot with an object (tasks.ts:342-345); THINGS cell 61 and 53 wide, 24 high (inventory-draw.ts:19, 38-40). The hook reasoning holds (plan-checks.ts:30 uses level.solids). Build table: labels A to Q, no step L, P3 is a row, J needs C and is M, G ships only the default; slot table matches sections 3, 5, 6, 7, 9; questions match the plan. Scope PASS (3 files: decor-expansion-design.md, decor.md one line, this file). issues:check --validate PASS (181 valid). No real brands or personal names. Defects to fix:
  - [ ] Shared engine pieces, row P1, "Used by" column still lists "hook" (the hook was dropped in round 2); remove it.
  - [ ] Build plan, row P3: "before N's table and bed, and P" refers to a removed label; it should say Q (swappable guitars).
  - [ ] Section 2: the task `fresh-flowers` is "offered while the flowers are wilting or dried", but the note also makes dried flowers not live (state-aware `isLive`). Care tasks are gated by `liveSlot` through `isLive` (game.ts:236), so a task using `liveSlot` would be hidden exactly when the flowers are dried. Say the task needs its own gate (a var check, not `liveSlot`), or that dried is final and only the wilting state offers it; and make the Q4 wording ("a free task freshens them") agree.
  - [ ] Section 9 sizes the still-only sill slot S but build row J and section 3 say M (it also renames the window and adds P8); make them agree.
  - [ ] P7 says `parseDeliveries`, `load` and `collect` all "drop what `decor.item` does not know"; `parseDeliveries` (deliveries.ts:60-88) does not look at the decor at all (it only checks id shape and time), only `load` (:213) and `collect` (:163) do. Reword; the meal entry still needs a shape there.
  - [ ] Minor: slot table lists kind `furniture` and P2 lists `clothes` but not `furniture`; P2 should name the kinds the slot table uses (and drop `clothes` if unused).
  Unverified: how anything looks or plays; issue 147's content; the origin of the trinket examples (author says Marc's request text); the sound feature's lookup of the record stand (not found in src; the section 8 cell says the sound feature finds it, which I could not confirm). reference-photos/ not opened.
- 2026-11-23 (claude): round 2 findings fixed in the doc (P1 users, P3 row label Q, `fresh-flowers` needs its own gate, still-only sill is M, P7 wording, kinds list, record stand wording). Two review rounds are used up; these were wording and consistency fixes, so no third review was run. Marc or the planner may run /review-issue 148 again if wanted.
- 2026-11-23 (reviewer 3, independent): Review of round 3. Verdict: APPROVE (with two small non-blocking wording nits). I did not trust the earlier entries and re-checked on my own.
  - Positions and sizes PASS. I parsed MAIN_MAP and the sprites with my own script: desk corners local x 3-18 and x 44-59, y 2-14 are every pixel `9` (tan); trinket-desk (140,17) is local (44,1); table dripper at local x 52-59, y 3-16, the dark item at x 41-49, mug prop at table local (38,11) with pixels reaching x 49/50, so the coffee cell (62,18) / local (46,2) and its 50-61 limit hold; rug cols 3-6 rows 3-4 are all `.` or the `@` start tile; wall strip row 0 cols 10-12 is `#` with floor at (11,1),(12,1); paintings at p 2-3, q 7-8, u 14-16 match 32/112/224; sill (288,112) is the lower `W` (rows 6-7) with floor in col 17; record stand R (9,7), package tile x (10,8), bare wall (9,8), bookshelf H col 10 rows 1-4, nightstand N cols 14-16 row 1, radiator, bed B cols 12-16 rows 2-7, sofa S cols 2-7 rows 5-6, guitar G (1,6), lamp L (8,6) all match the room table.
  - Engine claims PASS (checked in code): Decor.isLive/frozenVars take no state (decor.ts:168-182; game.ts:184,236); swap-decor resets only when wasLive && isLive; SWAP_PROMPT has only art, plant, lamp (tasks.ts:336); one swap task per slot with an object (tasks.ts:342); plan-checks builds the Grid from level.solids (so the dropped hook reasoning holds); tilemap.ts:200 default-sprite throw; type-desk pose on the chair tile (poses.ts:46; art-style.md:98); cook, reheat and eat-dinner require only NO_CLEAN_PLATES (tasks.ts:214-216); coffee requires mug max 0 "COFFEE IS WAITING" (tasks.ts:151); charge-phone 3 s, 8 points (tasks.ts:23); maxQueued 20; repeat decay exists (config.ts:54-57). The `frozen` hook only blocks increases (state.ts:178), so a `fresh-flowers` task that sets the dry count to 0 does work on a frozen dried bunch once it has its own gate.
  - Slot table, plan and questions PASS: slot areas agree with sections 3, 5, 6, 7, 9 and the room table; build rows A to Q have labels, sizes and needs that agree with the sections (J and the sill are M everywhere, P3 is its own row, G ships the default only, the preamble names the two steps that change a fresh game); 12 questions each carry a recommended default and match the plan.
  - Rules PASS: quiet collecting (no price, no loss, no timer that costs, swaps free and undoable), no real brands or recent or living artists or personal or employer names (my grep for brands and names found none), reference photos not described, item names and prompts use capitals and the font's Ñ (font.ts:94; dialogs.md:41).
  - Issue 147 PASS: I read the 147 branch (decor-data.ts, delivery-checkpoints.ts, decor-plants-147.test.ts). 147 only adds items and families (pothos, monstera, spider, three dried) to the existing `plant-shelf` slot, gifts on days 21-36, and no new slot, kind or engine change. The note's claim that a live plant after a dried one keeps the old vars matches 147's test ("a live one over a dried one keeps the snake plant's state"), and the note does not redesign them. The note's `flowers` family, pot and sill slot do not collide with 147's ids. decor.md changed on both branches in different places, which is only a possible merge-text conflict.
  - Scope PASS: `git diff main...HEAD --name-only` is docs/decor-expansion-design.md, docs/decor.md (one line) and this issue file. `npm run issues:check -- --validate`: 181 files valid (warnings on other issues only).
  - Non-blocking nits, for the author or the build issues, not a reason to hold the note: (1) build row B says it needs nothing, but the new kind `outfit` and its swap prompt are part of P2, which row A introduces; either B adds its own kind or B needs A. (2) Section 2 says a dried arrangement "stays for ever" yet `fresh-flowers` is offered when dried; say that dried is the resting state which the free task can still refresh.
  Not checked: how any of it looks or plays; the origin of the trinket examples; the Ñ in a 9 px list row. reference-photos/ not opened.
