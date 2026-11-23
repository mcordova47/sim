---
id: "156"
title: "Outfits: several per category, with a style attribute"
short: "Many outfits per style"
status: done
owner: claude
depends_on: []
summary: "Let the player own several casual, going-out and pajama outfits; a style is an attribute of an outfit."
kind: build
unverified:
  - "The Change clothes list was not looked at in a browser with many outfits (the cursor and scroll window are existing code, exercised by a test with ten made-up outfits but not drawn)."
  - "How the cardigan route test feels walking in the real game was not tried; it was judged on rendered sheets at 8x, 3x and 1x, and it is not in the game."
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
- 2026-11-23 (claude, independent review): approve. Verified myself in the worktree, not from the log above.
  - Criterion 1 (outfits as data, old outfits migrate): pass. `OUTFITS` is `{id,name,style,prefix}`; the first four keep indices 0 to 3 and their prefixes. A vite-node script of mine built a real `Game` from saved decor and `outfit` values: fresh, old save with outfit index 2 and no `worn` entry, index 3 with `worn: outfit-pajamas` (stays pajamas, `player-pajamas`), an unknown `worn` item id, and `outfit` = 99 and -5. All load without error; `outfit` is re-derived from the `worn` slot each frame, so an old index only matters through `worn`, and anything unknown becomes the everyday clothes. `outfitPrefix(NaN)`, `outfitPrefix(0.4)`, `outfitStyle(2.6)` are safe. The `outfit` var's `max` is `OUTFITS.length - 1` (3 today, so unchanged), and `OUTFIT_SPRITES` (`slice(1)`) is generic.
  - Criterion 2 (worn slot, Change clothes list, THINGS with many outfits): pass for logic. `outfits.test.ts` drives the real `SwapDecorActivity` over ten made-up outfits (wrap both ways, preview, choose, save and load) and THINGS entries; `DECOR.maxOwned` is 500, no limit hit. Drawn list: unverified (see front matter).
  - Criterion 3 (style only an attribute): pass. Grep shows `outfitStyle` is read only by tests; nothing in `src` branches on `style`; no gendered words in names, docs or the added art comments (grep of the added lines).
  - Criterion 4 (d2 evidence, nine not drawn): pass. I rendered `hand/`, `layered/` and `layered-putty/` myself (8 views each, 6x, in my scratchpad) and viewed the implementer's `compare-idle-8x.png` and `compare-walk-3x.png`; mine matches theirs. All 36 files are 16x16 with valid palette letters. Row diffs by `diff`: hand against layered is 0 rows in the 6 side-view files and 2, 2, 3, 3, 2, 1 in the 6 down and up files, exactly as written ("1 to 3 rows"). The tan cardigan visibly merges into the hair from behind and the putty one does not, as written. The recommendation (hybrid, generator writing ordinary `.sprite` files into `art/src`) follows from that evidence. The "slowest part by hand" and "55 rows typed" claims are effort claims I cannot check.
  - Criterion 5 (fresh game unchanged, checks, docs): pass. No file under `src/game/golden` changed and the golden frame tests pass; `npm run build` passes; `npm test` 174 files, 3964 passed, 3 skipped; `npm run issues:check -- --validate` passes (191 files valid, only existing warnings on other issues). `docs/decor.md` and `docs/art-style.md` were updated and match the code.
  - Experiment files outside the build: confirmed. The diff touches nothing in `art/src` or `public`; `scripts/sprites.mjs` reads only `art/src`; `grep -rl cardigan dist` finds nothing after the build.
  - Scope: only outfits code, tests, two docs, `art/options/route-test/` and this file. No other issue or PLAN.md edited. Privacy: nothing from reference-photos.
  - Not verified by me either: the Change clothes list drawn in a browser with many outfits, and how the cardigan walks in the real game (it is not in the game). Both stay in `unverified`.
  - Open and for Marc, not for this review: d1 (robe, proceeding on the default), d2 (choose the art route) and d3 (cardigan colour). Left as they are; the `needs` decide entry stays.
  - Verdict: approve. PLAN.md table needs updating by the planner.
