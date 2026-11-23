---
id: "156"
title: "Outfits: several per category, with a style attribute"
short: "Many outfits per style"
status: todo
owner: claude
depends_on: []
summary: "Let the player own several casual, going-out and pajama outfits; a style is an attribute of an outfit."
kind: build
decisions:
  - id: d1
    who: marc
    q: "The robe: Marc said it might be something you wear after a shower. How should that work?"
    options:
      - "the robe is an ordinary outfit you change into by hand; nothing automatic (simplest; revisit later)"
      - "after a shower you are put in the robe if you own one, until you change or sleep"
      - "after a shower the Change clothes list opens with the robe highlighted, so it is one press"
    recommendation: "the robe is an ordinary outfit you change into by hand for now; the shower hook is a later, separate step once the robe art exists"
    status: answered
    answer: "the idea is (2): after a shower you are put in the robe if you own one, until you change or sleep; but build it later, once the robe exists. For now the robe is an ordinary outfit changed by hand"
    by: marc
    on: 2026-11-23
  - id: d2
    who: marc
    q: "Each outfit needs 12 sprites (4 idle, 8 walk) and the poses (issue 150) multiply that. How should new outfits be drawn?"
    options:
      - "hand-drawn 12 sprites per outfit, as the existing three are (most control, most art)"
      - "a base body plus recolored or layered clothing, so a new outfit is mostly a palette and an overlay (cheaper, may look flatter)"
      - "let the agent test both on one outfit and report what each looks like"
    recommendation: "let the agent test both on one outfit and report, since nine new outfits are planned (about 108 sprites by hand) and the poses make it worse"
    status: answered
    answer: "the hybrid: one body template, each outfit's sprites generated from a small data entry (palette per region plus a rule per facing), a few hand-drawn rows where the silhouette changes; the generator is its own small issue before the outfit art"
    by: marc
    on: 2026-11-23
  - id: d3
    who: marc
    q: "Outfit art (156, d3): the cardigan's tan merges into the tan hair (badly from behind and at 1x). What colour should it be?"
    options:
      - "putty grey with taupe shading"
      - "keep tan and change something else"
      - "another colour"
    recommendation: "putty grey with taupe shading"
    status: answered
    answer: "fern + walnut for the cardigan (casual B)"
    by: marc
    on: 2026-11-23
needs: [{who: marc, kind: decide, why: "Say 'merge 156' when ready (outfits as data with a style; built, reviewed; d1 to d3 answered; branch issue/156-many-outfits)", since: 2026-11-23}]
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
- No outfit should make the player conform to a gender. Marc (2026-11-23): that does NOT mean avoiding words like "dress"; avoiding them would end up with male-coded things and make male the default perspective. Aim for a spread (dresses, skirts, suits, coats, robes) so no gender is the default; names are plain and descriptive.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's feedback on the art options (issue 155).
