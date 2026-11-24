---
id: "159"
title: "Draw the chosen outfits"
short: "Draw the outfits"
status: review
owner: marc + claude
depends_on: ["158"]
summary: "Add the outfits Marc chose from the options with the generator: casual, going out and pajamas."
kind: build
unverified:
  - "Every outfit was looked at in headless Chrome captures (8x sheets, the room at 3x and a 320x240 viewport as 1x), not at 1x on a real display by hand."
  - "The gift days (51 to 72) were not played through; they are numbers in delivery-checkpoints.ts and a test checks every item is a real one."
decisions:
  - id: d1
    who: marc
    q: "Blazer colour (159): the camel blazer you chose merged with the tan hair and the wooden floor (the back looked like hair continuing), so it is taupe with a white collar line. Keep taupe?"
    options:
      - "keep taupe"
      - "camel after all (tan, with the collar line)"
      - "another colour"
    recommendation: "keep taupe"
    status: open
needs:
  - who: marc
    kind: decide
    why: "Blazer colour: taupe (reads against hair and floor) or the camel you chose (merges with them)?"
    since: 2026-11-24
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
