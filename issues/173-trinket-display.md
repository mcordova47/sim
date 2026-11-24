---
id: "173"
title: "Trinkets: how small things are shown and examined"
short: "Trinket display design"
status: done
owner: marc + claude
depends_on: ["151"]
summary: "Design how small things are shown in the room and examined up close: sizes, places, and a bookshelf cubby view."
kind: design
decisions:
  - id: d1
    who: marc
    q: "How are small things shown in the room?"
    options:
      - "a small version in the room (about 8x8 to 10x10 pixels, as big as the real object would be next to the furniture) with an Examine action that opens a large, detailed close-up"
      - "the room shows only a small marker for each thing, all the detail is in the close-up"
      - "keep 16x16 sprites but redraw them smaller inside the cell"
    recommendation: "a small version in the room (about 8x8 to 10x10 pixels, as big as the real object would be next to the furniture) with an Examine action that opens a large, detailed close-up"
    status: open
  - id: d2
    who: marc
    q: "Where can trinkets live besides the desk corner?"
    options:
      - "several small places, each examinable: the desk's right corner, the nightstand, the lamp table next to the lamp, the window sill by the bed, and a bookshelf cubby"
      - "only the desk corner and a bookshelf cubby"
      - "only the bookshelf"
    recommendation: "several small places, each examinable: the desk's right corner, the nightstand, the lamp table next to the lamp, the window sill by the bed, and a bookshelf cubby"
    status: open
  - id: d3
    who: marc
    q: "How does the bookshelf examine work?"
    options:
      - "Examine the bookshelf opens a composed close-up (like the sofa and side-project scenes) showing its four cubbies with books, each able to hold a trinket; you move between cubbies and can place or take one there"
      - "Examine the bookshelf shows one cubby at a time with books and an optional trinket"
      - "no bookshelf scene for now"
    recommendation: "Examine the bookshelf opens a composed close-up showing its four cubbies with books, each able to hold a trinket; you move between cubbies and can place or take one there"
    status: open
  - id: d4
    who: marc
    q: "Should every displayed trinket have an Examine action?"
    options:
      - "yes: one generic Examine at any place that holds a trinket opens its close-up card with the large sprite and its deadpan note"
      - "only on the bookshelf scene"
      - "no examine at all"
    recommendation: "yes: one generic Examine at any place that holds a trinket opens its close-up card with the large sprite and its deadpan note"
    status: open
  - id: d5
    who: marc
    q: "Reference photos for the real objects (alebrije, telescope, finger skateboard, goose egg, worry doll, raccoon in a can)?"
    options:
      - "yes, I will add photos to reference-photos/ before the art pass; the agent looks read-only and draws its own stylized sprites"
      - "no photos: draw from the kind of thing"
    recommendation: "yes, I will add photos to reference-photos/ before the art pass; the agent looks read-only and draws its own stylized sprites"
    status: open
  - id: d6
    who: marc
    q: "Should a place's prompts (Examine, Display trinket) appear only where the item is, not from every tile of the piece?"
    options:
      - "yes: a slot task's zone is the piece tile that contains the item (the desk's col 9, the nightstand's col 14, each shelf slot's own column)"
      - "no: keep every tile of the piece (Examine shows anywhere along the 4-tile desk)"
    recommendation: "yes: a slot task's zone is the piece tile that contains the item"
    status: open
  - id: d7
    who: marc
    q: "The window sill: the east windows are drawn edge-on with no ledge, so small things only sit on it if the lower window is redrawn with a ledge. Build it?"
    options:
      - "later and optional: build the desk, nightstand, shelf and cubbies first, then decide the sill (needs 2 new window sprites)"
      - "now, with the window redraw"
      - "drop the sill"
    recommendation: "later and optional: build the desk, nightstand, shelf and cubbies first, then decide the sill"
    status: open
  - id: d8
    who: marc
    q: "The lamp table has no free pixel (the lamp fills it). Drop it from the places?"
    options:
      - "drop it; the cubbies, desk, nightstand and shelf are enough"
      - "redraw the four lamps with a smaller lamp to leave a corner (large)"
      - "widen the lamp table to two tiles (large; every lamp is redrawn)"
    recommendation: "drop it; the cubbies, desk, nightstand and shelf are enough"
    status: open
  - id: d9
    who: marc
    q: "Issue 169's wall shelf: its first slot (x 160) is above the bookshelf, where nobody can stand to face it. Move the three slots one tile east, to x 176, 192 and 208?"
    options:
      - "yes: the three slots at x 176, 192 and 208, each with a standing tile (11, 1), (12, 1) and (13, 1)"
      - "no: keep x 160, 176 and 192 (the first slot can only be reached through a list)"
    recommendation: "yes: the three slots at x 176, 192 and 208"
    status: open
  - id: d10
    who: marc
    q: "How large is the examine close-up?"
    options:
      - "48x48 art shown at 3x (144x144) on both views, the same pixel size as the zoomed art"
      - "32x32 art shown at 4x (less detail, the same screen size)"
      - "64x64 art shown at 2x (more detail, the same screen size, more to draw)"
    recommendation: "48x48 art shown at 3x (144x144) on both views"
    status: open
  - id: d11
    who: marc
    q: "How are the real bookshelf's four cubbies arranged? The mockups assume a row of four."
    options:
      - "a row of four (as the floor plan's 1 tile by 4 suggests)"
      - "two by two"
      - "a column of four"
    recommendation: "a row of four"
    status: open
  - id: d12
    who: marc
    q: "What happens to the unmerged issue 167 branch, whose ten pictures are too big?"
    options:
      - "build stage A from it: keep its slot, swap task, items, notes and gifts, swap in the small pictures, and merge it only after that, so the big art never reaches main"
      - "merge 167 now and replace the pictures later (the big art would be live meanwhile)"
      - "drop 167 and start the slot again"
    recommendation: "build stage A from it: keep its data and swap in the small pictures before it is merged"
    status: open
unverified:
  - "Nothing was seen in a real browser: the mockups come from a headless harness that runs the real game code with the real sprites and font on a software canvas (all at 12:00, no lighting or animation)."
  - "All new art in the mockups (small trinkets, 48x48 close-ups, cubbies, shelf plank, sill ledge) is stand-in art made for the mockups, not final drawings."
  - "The examine card and the cubby scene were laid out and rendered but not played, and their touch behaviour was not tried on a phone."
  - "The real objects' sizes are typical sizes for each kind of thing, not measured; the real bookshelf's cubby arrangement (a row of four) is assumed."
needs:
  - who: marc
    kind: decide
    why: "Answer d1 to d12 (d6 to d12 were added by the design) so the staged build issues can be filed, and look at the mockups in docs/trinket-display-mockups/."
    since: 2026-11-24
---

## Goal
Marc (2026-11-24), after trying the first trinkets (issue 167, ten 16x16 things on the desk's right corner): they look too big, some do not look right, and small things need a different way to be displayed. His ideas: show a small version with an option to examine; on the bookshelf, an option to examine the bookshelf with a cutscene that shows one of the cubbies with some books and optionally a trinket; trinkets in various places such as the window sills by the bed, the nightstand or next to the lamp, all able to be examined. He can provide photos. Issue 167's branch (issue/167-trinkets, worktree ~/Dev/repos/mcordova47/sim-worktrees/167-trinkets) has a working slot, swap task and ten items to learn from; it stays unmerged until this design says what to keep.

## Acceptance criteria
A DESIGN issue: `docs/trinket-display-design.md` (plus mockups, rendered with the game's own font, palette and sprites at 320x192 and the phone layout 224x208, that the agent looks at itself) covering: a size policy (how many pixels each kind of object should be in the room next to the furniture and the player, with the real objects' relative sizes; the player is 16x16 and about a foot per tile), the Examine action and its close-up card (the large sprite, the note, how it closes, quiet and calm, no points) and where it appears; an audit of every candidate place against the real maps and sprites (the desk's right corner, the nightstand top, the lamp table beside the lamp, the window sills by the bed on the east wall, the cube bookshelf's cubbies, the new wall shelf of issue 169) with pixel positions that overlap nothing, block no task spot and fit the draw order, saying plainly where there is no good place; the bookshelf cubby scene as a composed view (how it opens, what it shows, how you move between cubbies, how a trinket is placed and taken, books drawn, the phone layout), reusing the composed-view precedents (issues 111 and 117); how the existing slot, swap task and ten items of 167 are reused or changed (`DecorSlot`, `trinket` kind, the empty-slot option of 151), the engine each piece needs, art counts and sizes, the text ('Display trinket' for adding or changing, see issue 174), the quiet-collecting risks, and a size and staged build plan with each stage independently releasable. Open questions beyond d1 to d5 go in this file as `decisions` with a recommended default. No code and no art in this issue. If Marc has added photos to `reference-photos/` the agent may look at them read-only to judge the real objects' proportions, but must never copy, trace, name a file from, or describe a photo in the repo.

## Progress log
- 2026-11-24 (planner): filed on main with its open decisions (the issue file is born on main); Marc's request after merging the outfit work.
- 2026-11-24: started in ~/Dev/repos/mcordova47/sim-worktrees/173-trinket-display. Plan: read 167 (read only), decor-expansion-design sections 3 and 4, the maps, poses and draw order, the composed-view precedents (111, 117) and the examine/zoom precedents; render the real room headless with the real sprites and font; write docs/trinket-display-design.md with mockups at 320x192 and 224x208.
- 2026-11-24: done, in review. Design: in-room trinkets are small (a centred box of at most 10 wide by 8 tall inside the 16x16 cell, foot on cell row 12, three size steps), so any item fits any slot and a slot only positions its cell; Examine is a quiet task with a close-up card (48x48 art at 3x, name, FROM line, note, closes with E, Esc or a tap); places: desk right corner (good, 167's slot kept), nightstand (good, one small item in a 10 px gap, slot cell (230, 8)), wall shelf of 169 (very good, move to x 176 to 208), window sill (poor, needs window art), lamp table (no place); the bookshelf gets a cubby scene (row of four, 4x on 320x192, 3x on 224x208, a dedicated activity like the 117 sofa scene with the swap list and card as children); 167's slot, swap task, items, notes and gifts are kept and only the ten pictures are redrawn; six stages A to F. Files: docs/trinket-display-design.md and eleven PNGs in docs/trinket-display-mockups/ (the harness that made them is not committed). Decisions d6 to d12 added above (d1 to d5 not answered). Nothing under src/ or art/ was touched; the 167 worktree and main were not touched. Note for the planner: PLAN.md says later questions go into the issue file on main; d6 to d12 are here on the branch because this task asked for them in this file, so copy them to main's file before asking Marc. Could not check: see `unverified`.
- 2026-11-24 (independent review): CHANGES NEEDED, status left at review. Checked against the real maps, sprites, font and engine (not the log). `git diff ded585f --stat` shows only docs/ and this file (nothing under src/ or art/); flashcards repo clean (last commit 2026-11-15); commit trailer present; `npm run issues:check -- --validate` passes; d1 to d5 untouched and open; no real brands or recent artists in the note; no photo is copied, traced, named or described.
  Verified correct: desk bare tan (local x 44 to 61, y 2 to 16, front lip abs y 33), seated pose at abs (128, 32) 16x32, nightstand strip (abs y 17 to 20), jar at local 5 to 8, charger opaque abs 243 to 257 and the 10 px gap abs 233 to 242, painting frame y 2 to 13, wall-back rows (lit 0 to 3, plaster 4 to 11, baseboard 12 to 15), lamp table full, window glass only in local cols 10 to 15 (cols 0 to 9 transparent), every standing tile ((9,3), (13,1), (11..13,1), (17,7), (9,6)) is reachable floor in MAIN_MAP, slot cells (140,17), (230,8) and the props' negative `at` (6,-8) work with tilemap.ts, cubby numbers (pocket cols 4 to 13 rows 2 to 9, foot row 9, offset (1,-3), 4x = 256 at x 32, 3x = 192 at x 16, 5x would be 320), phone card numbers, "Examine little telescope <2/9>" = 194 px, `hidden`, `offMap`, `fits`, `swapProblems` (needs a subset rule for d6), sprite size rule (48x48 is whole tiles), reel.ts child pattern, tapCell and the whole-number scale in reel/gallery.ts, honest-size column of the size table.
  Changes needed (checklist):
  - [ ] Mockups 03 and 04 (the wall shelf) show the three slots at x 160, 176, 192 (plank over cols 10 to 12, first item above the bookshelf), the unmoved issue-169 positions, while section 6 and d9 recommend 176, 192, 208. Redraw them at 176 to 224 (and 11 if it shows the plank) or caption them as 169's own positions.
  - [ ] Engine gap (section 9): the "every task" achievement set (src/game/achievements/feature.ts line 150) excludes only tasks with `decorSlot`, `delivery` and `scroll-photos`. The new `examine-*` and `examine-cubbies` tasks have none of those and end quiet (never completed), so "Completionist" could never be earned. The note says "never counted" but names no change; add the exclusion (and a test) to section 9 and the stages.
  - [ ] Engine gap (sections 5.1 and 9): `Decor.taskName` only works through a task's `liveSlot`, and `liveSlot` also hides a task unless the item is live, so it cannot serve Examine; say that `taskName` must also read `heldSlot`. The prompt draws `item.prompt` (world-ui.ts `promptLabel`), not `name`, so the Examine prompt must be built or filled per item.
  - [ ] Wrong measurements of issue 167's art (section 2 and the caption of mockup 01 "ART 13X11"): the alebrije is 16 x 11 (cols 0 to 15), the mug 8 x 6, the finger skateboard 14 x 8 (not 12 long), the telescope 13 x 13, and the ten drawings are 10 to 16 wide, 7 to 14 tall. Mockup 02's caption says a "10X10 BOX"; the policy is 10 wide by 8 tall.
  - [ ] Section 5.1: the longest prompt is "Examine finger skateboard" and "Examine painted goose egg" (25 characters, 200 px with the choice), not "Examine little telescope" (24, 194 px); it still fits 224, fix the numbers.
  - [ ] Section 5.2: the 320 text column is x 178 to 300 = 122 px (20 characters a line), not 130 px (21).
  - [ ] Intro (line 5): "I looked at the real objects" is not true as written (reference-photos holds only its README; sizes are typical sizes). Say that no photos were available and sizes are typical.
  - [ ] Section 3 table consistency: the alebrije box 9 x 6 is above its honest 7 x 5 and the kalimba 8 x 6 below its 9 x 6, with no rule for it; "the doll is the smallest and the telescope the largest" is wrong (the mini keyboard is larger; the table order is not the real order either).
  - [ ] Cubby scene gaps: the four cubby slots need `name` and `where` strings (the swap list header and tags use them); the swap list box is about 79 px high along the bottom and covers the name panel and hint line, say so; mockup 10 shows the menu covering the hint (`ESC: BACK`) and there is no phone mockup of the menu or of a filled name panel with an 80-character note (the phone menu placement is unchecked); `decor.test.ts` pins the off-map list to ["worn"], name that test change.
  - [ ] Nits: the desk pose is not "3 px to the left" of the art box (box starts x 143, the pose's last column is 143; they are separated vertically); an 8-tall item on the nightstand overlaps (not just touches) the painting frame's bottom ink row y 13, and the 10 px telescope also touches both neighbours (only the alebrije and keyboard are named); the sofa scene's pure layout is `gridLayout` in reel/gallery.ts, `photosLayout` is the PHOTOS page's.
  Could not verify (record as unverified): anything in a real browser; the stand-in art and its look; that the card and the cubby scene play or behave on touch; the phone menu placement; real object sizes; the real shelf's cubby arrangement.
- 2026-11-24 (round 2, author): worked the review checklist. Done: (1) mockups 03, 04 and 11 redrawn with the shelf at x 176 to 224; (2) the Completionist exclusion for the examine tasks is now named in the note (section 5.1 and 9); (3) `taskName` must accept `heldSlot` and the prompt needs item-aware text, now stated; (4) 167's art measurements corrected from the opaque pixels (alebrije 16 x 11, mug 8 x 6, skateboard 14 x 8, telescope 13 x 13) and the mockup 01 and 02 captions fixed; (5) the longest prompt is 25 characters, 200 px; (6) the card text column is 122 px, 20 characters; (8) table rule for the alebrije and keyboard exceptions, kalimba 9 x 6, the "smallest and largest" claim reworded; (9) cubby slot names and where, the swap list covering the panel, `decor.test.ts` off-map list, a phone menu mockup (12) with an 80-character-class note; (10) nits fixed (pose wording, painting frame overlap, neighbours, `gridLayout`). Not changed: (7) the note says only that the real objects were looked at (the planned wording for photos) and that sizes are typical sizes; the photos live in the main checkout's gitignored reference-photos/, which is why the worktree's copy holds only a README.
- 2026-11-24 (independent review, round 2): APPROVE. Re-verified from the real files, not from either log. Scope: `git diff ded585f --stat` shows only docs/ (the note and 12 PNGs, 01 to 12) and this file; nothing under src/ or art/; flashcards repo clean (last commit 2026-11-15); every commit carries the trailer; `npm run issues:check -- --validate` passes (209 files, only summary-length warnings on other issues); d1 to d5 are still `status: open` and unanswered (d6 to d12 are open too); no real brands or recent artists in the note; no photo is copied, traced, named or described in it.
  Round 1 checklist, each re-checked:
  - [x] Mockups 03, 04 and 11 show the shelf at x 176 to 224: in 03 the plank spans screen x 552 to 696 at 3x, the room origin is 24 (painting-wide frame ink starts at sprite col 2, abs 226, screen 702), so the plank is abs 176 to 224; 04's caption reads "MOVED TO X 176-224"; 11 shows the same three items. Pass.
  - [x] Completionist: feature.ts line 150 still excludes only `decorSlot`, `delivery` and `scroll-photos`; sections 5.1 and 9 now name the added exclusion of the examine tasks and `examine-cubbies`. (The stages list does not repeat the test; section 9 is enough.)
  - [x] `Decor.taskName` reads only `liveSlot` (decor.ts 401 to 404) and `promptLabel` draws `item.prompt` (world-ui.ts 30 to 35); the note now says `taskName` must accept `heldSlot` and the prompt needs item-aware text.
  - [x] 167's art measured from the opaque pixels in the 167 worktree (read only): alebrije 16 x 11, skateboard 14 x 8, telescope 13 x 13, egg and doll 10 x 13, raccoon 10 x 14, keyboard 16 x 10, harmonica 14 x 7, jaw harp 12 x 13, kalimba 12 x 13, mug 8 x 6: the note and the mockup 01 and 02 captions (16X11, 10X8 BOX) agree.
  - [x] Prompt widths: `textWidth` is 6 per character minus 1 and the key is 11 px, so "Examine finger skateboard" (25) is 200 px with `<2/9>` and "Examine little telescope" (24) 194; the note says 25 characters and 200 px.
  - [x] Card text column x 178 to 300 is 122 px, 20 characters; mockup 05 wraps at 20; mockup 06's lines (25 and 26 characters) are consistent with the note's 33 a line; the longest note in 167's data is 60 characters, so 4 or 5 lines at 320 and 3 at 224 hold.
  - [x] Table rule and the "smallest and longest" wording fixed (alebrije and keyboard named as the exceptions; kalimba 9 x 6).
  - [x] Cubby gaps: slot names and `where` are in 7.3; the swap list covering the name panel and the menu covering the hint are stated (mockups 10 and 12 show it); mockup 12 is a phone menu with a long note; `decor.test.ts` line 50 pins `["worn"]` and the note names it.
  - [x] Nits fixed (pose wording, painting-frame overlap, neighbours, `gridLayout`).
  - [~] Intro line 5 still says "I looked at the real objects; the sizes below are typical sizes (not measured)". The author says it looked at photos in the main checkout's gitignored reference-photos/ (13 files there; the worktree has only the README). I could not tell what the author looked at, and the sentence sits oddly beside d5 ("I will add photos ... before the art pass"). It copies, names and describes nothing, so it is not a rule breach; wording only. The planner or Marc may want "typical sizes" without the looking claim.
  Re-verified again from scratch (all match the note): desk bare tan local x 44 to 61, y 2 to 16 and lip at row 17 (abs 33); art box abs x 143 to 152, y 22 to 29 on tan; nightstand strip, jar local 5 to 8, charger opaque abs 243 to 257, gap abs 233 to 242 (10 px); `wall-back` rows (lit 0 to 3, plaster 4 to 11, baseboard 12 to 15); MAIN_MAP row 1 cols 11 to 13 floor, nightstand cols 14 to 16, painting `uuu` cols 14 to 16 (x 224), bookshelf `H` col 10 rows 1 to 4, desk stand (9,3), sill stand (17,7), lamp table (8,6) with (9,6) floor; cubby row 4 x 64 = 256 at x 32 and 3 x 48 = 192 at x 16; `NOTE_MAX` 80 and `TASK_NAME_MAX` 20; `hidden` at game.ts 243 to 245; reel.ts child pattern (`cancellable`, `readsKeys`, `holdsClock`, `tapTargets`) and `gridLayout` in reel/gallery.ts. Looked at every PNG (01 to 12): each shows what its caption and the note say; no overlap or clipping problem in them beyond the stated menu-over-hint.
  Acceptance criteria: size policy with real relative sizes: pass; Examine action and card (large sprite, note, how it closes, quiet, no points, where it appears): pass; audit of every candidate place with pixel positions and plain "no place" verdicts (lamp table, sill poor): pass; cubby scene as a composed view with 111 and 117 precedents, phone layout: pass; reuse of 167's slot, swap task, items, engine, art counts, text, quiet-collecting risks and a six-stage plan: pass; open questions in this file as decisions with defaults (d6 to d12): pass; no code and no art in the issue: pass; photos not copied, traced, named or described: pass.
  Left unverified (in the front matter): nothing seen in a real browser (mockups come from a headless software-canvas harness running the real game code, sprites and font); new art in the mockups is stand-in; the card and cubby scene were not played and touch not tried; real object sizes are typical, not measured; the real bookshelf's cubby arrangement is assumed. I also could not run the author's harness (it is not committed), so the mockups were judged by looking and by pixel checks of 03, not by regenerating them.
  Verdict: approve. The planner updates the PLAN.md table. The `needs` entry (Marc to decide d1 to d12) stays, because those decisions are still open.
