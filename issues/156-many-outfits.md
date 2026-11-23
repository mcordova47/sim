---
id: "156"
title: "Outfits: several per category, with a style attribute"
short: "Many outfits per style"
status: review
owner: claude
depends_on: []
summary: "Let the player own several casual, going-out and pajama outfits; a style is an attribute of an outfit."
kind: build
unverified:
  - "The Change clothes list was not looked at in a browser with many outfits (the cursor and scroll window are existing code, exercised by a test with ten made-up outfits but not drawn)."
  - "How the cardigan route test feels walking in the real game was not tried; it was judged on rendered sheets at 8x, 3x and 1x, and it is not in the game."
needs: [{who: marc, kind: decide, why: "Choose the art route for the new outfits (d2) from the comparison, and the cardigan colour (d3).", since: 2026-11-23}]
decisions:
  - id: d1
    who: marc
    q: "The robe: Marc said it might be something you wear after a shower. How should that work?"
    options:
      - "the robe is an ordinary outfit you change into by hand; nothing automatic (simplest; revisit later)"
      - "after a shower you are put in the robe if you own one, until you change or sleep"
      - "after a shower the Change clothes list opens with the robe highlighted, so it is one press"
    recommendation: "the robe is an ordinary outfit you change into by hand for now; the shower hook is a later, separate step once the robe art exists"
    status: open
  - id: d2
    who: marc
    q: "Each outfit needs 12 sprites (4 idle, 8 walk) and the poses (issue 150) multiply that. How should new outfits be drawn?"
    options:
      - "hand-drawn 12 sprites per outfit, as the existing three are (most control, most art)"
      - "a base body plus recolored or layered clothing, so a new outfit is mostly a palette and an overlay (cheaper, may look flatter)"
      - "let the agent test both on one outfit and report what each looks like"
    recommendation: "let the agent test both on one outfit and report, since nine new outfits are planned (about 108 sprites by hand) and the poses make it worse"
    status: open
  - id: d3
    who: marc
    q: "The cardigan (casual B) in tan is the same colour as the hair at 1x, and it blends in, from behind especially. What colour should it be?"
    options:
      - "putty grey (the test in art/options/route-test/layered-putty), clearly apart from the hair"
      - "keep the tan of the candidate and accept that it blends"
      - "something else (say which)"
    recommendation: "putty grey with taupe shading; the other planned tops are drawn with colours the hair does not use"
    status: open
---

## Goal
Marc (2026-11-23), choosing from the outfit options (issue 155): "i don't think we should limit ourselves to one outfit per category; that could maybe be an attribute of the outfit, but you should be able to have multiple casual/going out/pajama outfits." Today `OUTFITS` in `src/game/outfits.ts` is a fixed list of four (home, casual, out, pajamas), one per style, and the decor items are `outfit-<id>`. Build the system so many outfits can exist and be owned, each with a `style` (home, casual, out, pajamas) as an attribute, without any new art yet beyond what exists.

The outfits Marc picked (to be drawn in a later art issue, after this system and the art route in d2): casual: the current one, A (grey hoodie), B (cardigan over a tee), D (denim jacket over a tee); going out: the current flannel, A (jacket and scarf), B (button-up), D (blazer), E as a peacoat (the dress comes back later, see docs/ideas.md); pajamas: the current one, A as vertical stripes, C (the robe). Candidates are in `art/options/` on the 155 branch (or main once merged).

## Acceptance criteria
- Outfits are data with an id, a name, a `style` and a sprite prefix; adding an outfit is a data line plus its sprites (and its item); the four existing outfits migrate without changing how they look or how a saved game loads (the `outfit` state variable and the `worn` slot keep working; an old save with an outfit index still loads sensibly).
- The `worn` slot and the Change clothes list handle many outfit items (scrolling, the notes, THINGS shows each).
- `style` is only an attribute for now (shown or unused); nothing depends on it, and nothing says an outfit is better than another.
- Decide d2's art route with evidence on one outfit (a hand-drawn set against a recolor/layer route) and write what each looked like and cost, with a recommendation; do not draw all nine.
- A fresh game is unchanged (golden frames); standard checks pass; docs/decor.md and docs/art-style.md updated.

## Notes (planner)
- Poses staying in everyday clothes is issue 150; the art route chosen here decides how that is fixed.
- No outfit may imply a gender; keep names neutral (for example "jacket and scarf", "peacoat").

## Progress log
- 2026-11-23 (planner): filed on main from Marc's feedback on the art options (issue 155).
- 2026-11-23 (claude): started. Working assumptions: d1 and d2 as recommended (robe is an ordinary outfit, no shower hook; test both routes on one outfit and report).
- 2026-11-23 (claude): built. `OUTFITS` is now `{ id, name, style, prefix }` data (style: home, casual, out, pajamas; only an attribute, nothing reads it) with `outfitStyle`, `outfitItemId` and helpers that take an optional list; the four old outfits keep indices 0 to 3, so saves and the `worn` slot are unchanged; the `outfit` state var's max follows `OUTFITS.length - 1` (before it was a fixed 3, which would have clamped new outfits). The Change clothes list (4 rows with a cursor window) and THINGS (pages) already handle many items, so no UI change. No outfit added to the game. Tests: `src/game/outfits.test.ts` (data rules, ten made-up outfits through the real swap activity, THINGS entries, save and load, neutral names), `decor-worn.test.ts` now also pins item name = outfit name. Golden frames unchanged (no re-record). Docs: `docs/decor.md` ("What issue 156 built"), `docs/art-style.md` ("Outfit sprites").
- 2026-11-23 (claude): d2 evidence on casual B (cardigan over a tee), files in `art/options/route-test/` (not in `art/src`, not shipped): `hand/` 12 hand-written sprites, `layered/` the same 12 made by `layer-outfit.mjs` (the shipped casual sprites as the body template; torso repainted by a rule per facing), `layered-putty/` the same with one palette change, and `compare-*.png` (idle 8x, walk 8x, walk 3x). Looked at all at 8x and 3x, idle and walking, all four directions.
  - Hand-drawn: 12 files, about 55 torso rows typed out one by one (a length check in my helper caught nothing wrong, but each walk frame's shifted torso and arm position had to be worked out by hand, the slowest part). Best result: it can add a V of skin at the neck (the one thing the rule lacks).
  - Layered/rule: one 50-line script, 12 sprites in a blink. Identical to the hand set in the 6 side-view files, and 1 to 3 pixel rows different in the other 6 (the V-neck, and where the back seam falls in the arm-swing rows). Of course I wrote the hand set with the same idea in mind, so this shows the rule loses little for a tee-and-jacket outfit, not that hand drawing is never better. At 1x walking I could not tell them apart. A different colour is one argument and a re-run (the putty version), where by hand it is a search and replace over 12 files and a re-look.
  - Both: the tan cardigan merges with the tan hair (the hair is colours 8 and 9), badly from behind and at 1x; putty grey fixes it and is the new question d3. In the side views the white tee shows as a strip at the front edge that reads a little like a flap outside the arm; it is the same in both routes and not a route difference.
  - Where the layered route will not reach: outfits that change the silhouette (a scarf at the neck, a long coat or robe over the legs, shorts showing legs, a dress). The torso block rule does not cover the legs rows or the neck. Those need a few hand-drawn rows on top of the template.
  - Recommendation (for d2): a hybrid. Keep one body template (the existing casual sprites), generate each outfit's 12 sprites from a small data entry (a palette per region, a torso rule per facing) with a script that writes ordinary `.sprite` files into `art/src` (so the game, the sprite checks and the pose code stay as they are), and allow a few hand-drawn pixel rows per outfit on top (the V-neck, a scarf, a coat hem). That makes a plain recolor outfit (hoodie, striped pyjamas, stripes) nearly free and keeps hand drawing for what truly differs. For the poses (issue 150) a palette map over the home pose sprites (shirt `h`, trousers `4`) covers solid-colour outfits; patterned ones still need drawing. The script itself (this one is a test, tied to casual B) would be its own small issue before the art issue.
  - I did not draw the other eight and did not add the cardigan to the game.
- 2026-11-23 (claude): checks run in the worktree: `npm run build` (tsc and vite) passes; `npm test` 174 files, 3964 tests pass; `npm run issues:check -- --validate` below. Status set to review.
