---
id: "159"
title: "Draw the chosen outfits"
short: "Draw the outfits"
status: done
owner: marc + claude
depends_on: ["158"]
summary: "Add the outfits Marc chose from the options with the generator: casual, going out and pajamas."
kind: build
unverified:
  - "Every outfit was looked at in headless Chrome captures (8x sheets, the room at 3x and a 320x240 viewport as 1x), not at 1x on a real display by hand."
  - "Review: the taupe blazer was not seen on the wooden floor of the main room in the real game (the walks were in the bathroom's lilac tiles; the peacoat was seen in the main room); judged there from the palette (taupe a29b8c against oak and tan)."
  - "The gift days (51 to 72) were not played through; they are numbers in delivery-checkpoints.ts and a test checks every item is a real one."
decisions:
  - id: d1
    who: marc
    q: "Outfits (159, d1): the blazer came out taupe, not the camel you chose, because camel merged with the tan hair from behind and the wood floor. Keep taupe?"
    options:
      - "keep taupe with a white collar line at the nape"
      - "go back to camel"
      - "another colour"
    recommendation: "keep taupe with a white collar line at the nape"
    status: answered
    answer: "keep taupe (taken by the planner: Marc said everything else is perfect; change it if not)"
    by: planner
    on: 2026-11-24
needs: [{who: marc, kind: try, why: "Look at the eight new outfits: cd ../sim-worktrees/159-draw-the-outfits && npm run sprites -- --sheet=player and open art/contact-sheet.png, or npm run dev with ?own=outfit-<id>; then answer d1 and say 'merge 159'", since: 2026-11-24}]
---

## Goal
Add the outfits Marc chose (issue 155, d2 to d4) using the generator (issue 158), each as a decor item arriving as a gift (new days after 45) with a deadpan note:
- **Casual:** A (grey hoodie), D (denim jacket over a tee). (B, the fern cardigan, is the proof outfit in 158.)
- **Going out:** A (jacket and scarf), B (button-up), D (blazer), E as a peacoat.
- **Pajamas:** A as vertical stripes (not horizontal), C (the robe; a hand-drawn overlay over the legs; the shower hook is a later idea in docs/ideas.md).
- Later: the dress, a red jacket (brick with walnut shading); see docs/ideas.md. A spread so no gender is the default (Marc, 2026-11-23).
Candidates are in `art/options/`.

## Acceptance criteria
- Each outfit is a data entry (and hand rows where needed); look at each walking in four directions at 1x and in the room, and drop or redraw those that do not read; say what you saw. Every outfit is distinguishable from the hair and from the others.
- Items, notes and gift days added (state the days; Marc can change them); new strings in docs/text-review.md.
- Standard checks pass; a fresh game is unchanged. Split into two issues if it is too much for one review.

## Progress log
- 2026-11-23 (planner): filed on main; waits for 158.
- 2026-11-24 (claude): started in worktree ../sim-worktrees/159-draw-the-outfits. Plan: add the rules the eight outfits need to the generator (hoodie, scarf, placket, buttoned, robe, vertical stripes; long sleeves, a collar at the nape, a hem over the legs), eight entries in `art/outfits.json`, the items and gifts, then look at each walking in the real game and drop or redraw what does not read.
- 2026-11-24 (claude): built.
  - Generator (`scripts/outfits.mjs`): new rules `hoodie`, `scarf`, `placket`, `buttoned`, `robe`, `stripes-v`; new entry options `sleeves`, `torso.collar`, `hem`, `legStripes`; an overlay keyed by a misspelt file name now throws (the 158 reviewer's note). The cardigan's 12 files are byte-identical (no diff). The robe's legs come from `hem` (the leg rows move in the walk frames, so one rule per row does every frame) rather than hand-drawn rows; the data still supports overlays.
  - Outfits (items, plain names, deadpan notes, gift day after 48; the days are a planner default, a number each in `delivery-checkpoints.ts`): day 51 GREY HOODIE (casual A, putty with a taupe hood and pouch, jeans), 54 DENIM JACKET AND TEE (casual D, dusk-grey trousers), 57 JACKET AND SCARF (out A, dusk-blue jacket, brick scarf, night trousers), 60 BUTTON-UP SHIRT (out B, sky with a paper placket), 63 BLAZER AND TEE (out D, taupe), 66 PEACOAT (out E, slate, butter buttons, hem over jeans), 69 STRIPED PAJAMAS (pajamas A, vertical sky and paper stripes on top and legs), 72 BATHROBE (pajamas C, paper robe, tangerine belt, bare ankles). `OUTFITS` lines at the end (indexes 5 to 12), gift items, checkpoints; the two count tests raised by 8 (23 to 31 gifts, 20 to 28 checkpoints). Strings are in docs/text-review.md (the cardigan's too, which 158 had left out). Docs: art-style.md 'Generated outfits' (new rules and options), decor.md 'What issue 159 built'.
  - Not drawn (as asked): the dress and the red jacket (docs/ideas.md); the robe shower hook.
  - What I saw: 8x sheets of all 12 frames of every outfit, then the real game (dev server, headless Chrome, real arrow keys held for each direction, the item worn through the `worn` slot, 3x captures plus a 320x240 viewport as 1x).
    - Grey hoodie: reads as a light grey top with a darker band at the neck (hood); from behind a grey back with the hood bulge, clearly apart from the brown hair; sides fine. The pouch is faint at 1x.
    - Denim jacket: front is blue jacket open over a white tee, grey-blue trousers; back a plain blue back; side views show a dotted white strip at the front edge (noisy, like the cardigan's). Not mistaken for the everyday outfit (that is a blue tee over slate).
    - Jacket and scarf: the clearest of the going-out set: red band at the neck and two ends hanging in front, dusk-blue jacket, dark trousers; red band shows from behind and the sides.
    - Button-up: light blue with a pale placket and a collar; reads as a light-blue shirt, plain from behind (not much more than a tee at 1x, as 155's reviewer predicted).
    - Blazer: the camel version I first drew merged with the tan hair from behind and with the wooden floor, so it became taupe with a paper collar line at the nape; now clearly apart from both. Front: grey-brown jacket open over a white tee. (d1 asks Marc whether to keep taupe.)
    - Peacoat: dark slate coat to the knee with two columns of butter buttons on the front; blue jeans show below the hem; plain back. Reads as a long coat; dark in the room's evening light but separate from the hair.
    - Striped pajamas: vertical sky and paper stripes down the body and the legs, reads as pajamas at 8x and 3x; at 1x the stripes are a soft blur but the light colour stands out from everything else.
    - Bathrobe: paper robe with a V of skin at the neck, a tangerine belt, robe to the knee and bare ankles below; the belt reads from every direction.
    - Distinguishable: hoodie (light grey), denim (blue over white), scarf (red band), button-up (light blue), blazer (taupe), peacoat (dark), stripes (pale blue stripes), robe (white and orange), cardigan (fern), plus the original three; none matches the hair (tan and oak). Nothing dropped: all eight read; the blazer was redrawn (colour).
  - Checks: `npm test` 175 files, 4094 pass, 3 skipped (golden frames unchanged, no re-record); `npm run build` passes; `npm run sprites` twice leaves git clean after the first commit; the generator tests cover the robe hem, the stripes and a misspelt overlay name.
  - Not checked: 1x on a real display by hand, the gift days in a long play.
- 2026-11-24 (claude, independent review): verdict approve.
  - Checks I ran: `npm test` 175 files, 4094 pass, 3 skipped; `npm run build` ok; `npm run sprites` leaves `git status` clean ("Outfit sprites are up to date"); `issues:check --validate` ok. `git diff main --name-status -- art/src public/sprites` shows only additions (192 files = 8 outfits x 12 x 2): the cardigan and the three hand-drawn outfits are untouched, byte for byte.
  - My own script over all 96 new .sprite files: every one is 16x16, every key is in `art/palette.json`, the transparent silhouette is identical to `player-casual` in all 12 frames (only torso and leg rows 7 to 14 differ, so hair and face are unchanged), no text-like shapes. `OUTFITS` has 13 entries; every generated one has an `outfit-<id>` item with its sprite and a `gift-day-N` checkpoint (days 51 to 72 step 3, after 48, no duplicates); the counts 31 and 28 match.
  - Generator: a misspelt overlay key throws; `sleeves`, `collar`, `hem` and `legStripes` behave in all 12 frames (the hem rows move with the walk frames; the lowest arm pixel stays a hand; collar only on the back and sides). Not found wrong in any frame.
  - Looked: 8x sheet of 13 outfits x 12 frames; the real game (dev server, headless Chrome over the DevTools protocol, real arrow-key holds, `decor.place("worn", ...)` via a temporary `__game` line, reverted with git checkout) for all 12 outfits walking down, up, left and right at 3x (viewed at about 6x) on the bathroom's lilac tiles, plus the peacoat in the main room at 3x.
    - Hoodie: light grey top, darker hood band and bulge from behind, jeans; clear against the hair, a little close to the blazer in value from behind but the blazer has a white nape line and dark trousers.
    - Denim jacket: blue open jacket over a white tee in front, plain blue back (no stripe down the back), grey-blue trousers; sides show a dotted white tee edge (noisy, same as the cardigan).
    - Jacket and scarf: red band at the neck from every side, two ends in front; clearest of the set.
    - Button-up: light blue with a pale placket and a darker collar; plain light blue from behind and the sides; reads as a light-blue shirt, close to a tee at 1x as predicted.
    - Blazer (taupe): grey-brown jacket open over a white tee in front, plain taupe back with a paper line at the nape, dark trousers. It reads, and is apart from the tan hair, the bathroom tiles and the other outfits. On the wooden floor of the main room I did not capture it (see unverified).
    - Peacoat: dark slate to the knee, two columns of butter buttons on the front, jeans at the feet only, plain back; reads as a long coat and is clearly apart from the hair; it is the darkest outfit, near the outline colour at 1x.
    - Striped pajamas: vertical sky and paper stripes on the body and legs, from every direction; reads as pajamas, light colour stands out from everything else; a soft blur at 1x.
    - Robe: paper robe with a V of skin at the neck (a little like a long neck from the front), a tangerine belt visible from all four directions, bare ankles; reads as a robe.
    - All 12 are distinguishable from the brown hair (tan and oak) and from each other by colour block: grey, denim over white, red band, light blue, taupe, dark slate, blue-white stripes, white-and-orange, plus the earlier green cardigan, green sweater, red and teal.
  - Scope: only art/outfits.json, generator and its test, sprites, the four src files, the two count tests, three docs and this issue. No other issue or PLAN.md edits. No `reference-photos` content.
  - Criteria: each outfit a data entry, looked at walking in four directions and in the room, said what I saw: pass (1x on a real display by hand: can't verify). Distinguishable from hair and each other: pass. Items, notes, gift days stated, strings in docs/text-review.md: pass (gift days in a long play: can't verify). Standard checks, fresh game unchanged: pass (golden frames unchanged, 8 new entries are gifts only).
  - Left for Marc: d1 (keep the taupe blazer, which I agree reads better than camel would). The rest is approved.
- 2026-11-24 (claude, after Marc looked): Marc said the outfits look good, with two changes.
  - (1) Jacket and scarf is asymmetric from the front: a new `scarf-tail` rule (used for the `down` facing only in `art/outfits.json`) draws the knot across the neck and one tail, four columns wide then two, hanging on the left of the picture, the drawing in art/options/out OUT A. The up and side views are unchanged (the same band). Compared at 8x (all 12 frames, symmetric above, tail below) and at 1x: the tail version looks like a knotted scarf with a loose end; the symmetric one looked like a wide red bib. At 1x it is a small off-centre red notch. A test pins the tail to one side.
  - (2) Marc's instruction: Change clothes is now offered at the cube bookshelf, not the nightstand. `swap-worn` moved from the nightstand's `tasks` to the cube bookshelf's (after `swap-plant-shelf`) in `src/game/apartment.ts`; the `worn` slot's `object` is `cube bookshelf` (`decor-data.ts`, its comment no longer says drawer); the test title says the bookshelf (its spot lookup is by task id, so it follows). `swapProblems` and the choice-cycle tests pass; the bookshelf cycle now ends with the plant swap and the clothes swap. docs/decor.md (the 152 section, the swap task list) says so and notes the move. docs/decor-expansion-design.md is design history and was left alone. No item note or string says drawer for clothes (the only "drawer" is the lavender note about its smell, unrelated), and the text-review strings do not name the nightstand.
  - d1 (blazer) is closed as on main: taupe, answered by the planner.
  - Checks: `npm test` 4100 pass; `npm run sprites` clean second run; `npm run build` passes.
- 2026-11-24 (claude, independent review of the follow-up commit 8d46f44): verdict approve.
  - Scarf: only the three down files changed (`git diff HEAD~1 -- art/src`: idle-down, walk-down-1, walk-down-2); the up and side files (9) are byte-identical. Rendered all 12 frames at 8x and 1x with sprite-lib. At 8x the front reads as a knotted scarf with one loose tail on the left of the picture; in both walk-down frames the tail moves with the body shift and stays on the same side; up and side views keep the plain band. At 1x it is a small off-centre red notch, readable as a scarf end. Small difference from the art/options OUT A drawing: the knot row spans x 3 to 12 (the drawing x 4 to 11) and the tail is at x 6 and 7 (the drawing x 5 and 6), so it sits a column nearer the middle; not a problem.
  - Bookshelf: real game (dev server, headless Chrome, real Tab and E key events, temporary `__game` line reverted by git checkout), with outfit-out and a spare plant owned: at the nightstand spot the choices are charge-phone and order-takeout only (no swap-art-bed, since no spare painting, and no swap-worn); at the bookshelf spot the cycle is water-plant, sort-records, swap-plant-shelf, swap-worn and wraps back (check-plant was not offered in that game state; the other record sort variants likewise). The list opened (CLOTHES 2/2, everyday clothes in place), Down moved the highlight, E put on the going out outfit (`worn` outfit-out, `outfit` 2) and the task ended.
  - Grep of src and docs for clothes at the nightstand or a drawer: none left except docs/decor.md's history notes of the move, docs/decor.md line 29's object list (nightstand there is still right for swap-art-bed) and docs/asset-review.md (furniture list). docs/decor-expansion-design.md untouched.
  - Checks: `npm test` 175 files, 4101 pass, 3 skipped; `npm run build` ok; `npm run sprites` "up to date", `git status` clean; `issues:check --validate` ok.
  - Notes, not blocking: the test "offer Change clothes at the cube bookshelf" only checks the fresh-game negative and the prompt, not that the task is offered at the bookshelf or absent at the nightstand once an outfit is owned (the new structure is covered by `swapProblems` and what I ran by hand). The scarf test checks the tail's side from idle-down only.
