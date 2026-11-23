---
id: "158"
title: "Outfit generator: sprites from a small data entry"
short: "Outfit generator"
status: review
owner: claude
depends_on: ["156"]
summary: "Generate an outfit's 12 sprites from a palette per region plus a torso rule, with a few hand-drawn rows on top."
kind: build
unverified:
  - "The Change clothes list and the THINGS page were not looked at drawn with the cardigan in them (covered by tests that drive the real swap activity, not by a screenshot)."
  - "How the cardigan feels walking at the real 1x size on a normal display was judged from 3x browser captures, not at 1x on a screen."
decisions:
  - id: d1
    who: marc
    q: "The cardigan's gift day (the planner left it open). I put it on day 48, three days after the pajamas. Is that fine?"
    options:
      - "day 48, after the pajamas"
      - "another day"
    recommendation: "day 48; change the number in delivery-checkpoints.ts to move it"
    status: open
---

## Goal
Marc (2026-11-23), decision d2 of issue 156: the hybrid art route. One body template; each outfit is a small data entry (a palette per body region plus a torso rule per facing); a script writes ordinary `.sprite` files into `art/src`, so the game and the sprite checks do not change. A few hand-drawn rows per outfit can sit on top where the silhouette changes (a scarf, a long coat, the robe over the legs, a dress, shorts). Start from the agent's experiment in `art/options/route-test/` (`layer-outfit.mjs`, 50 lines, which repainted the shipped casual sprites as the body template and matched a hand-drawn cardigan to within 1 to 3 pixel rows in the front and back views).

## Acceptance criteria
- A data file lists outfits (id, regions with palette keys, torso rule per facing, optional hand-drawn row overlays) and `npm run sprites` (or a sibling command it calls) generates each outfit's 12 files (`player-<id>-idle-<dir>`, walk frames) into `art/src`; generated files carry a header saying so; re-running changes nothing if the data did not.
- Palette keys only, no text in sprites; a test fails if a generated sprite is not 16x16 or uses a non-palette key.
- The three existing outfits (casual, out, pajamas) are not regenerated or changed; the generator is proven on ONE new outfit (casual B, the cardigan, fern with walnut shading as Marc chose) added to the game as a gift item with its note (`from`, deadpan), shown in the Change clothes list and walked in the real game; say what you saw.
- Document how to add an outfit (a data entry and, if needed, hand rows) in docs/art-style.md ('Outfit sprites') so Marc can add one without Claude; the poses (issue 150) are out of scope but note how the same palette map could cover them.
- A fresh game is unchanged (golden frames); standard checks pass; `npm run sprites` leaves git status clean.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answer to d2 of issue 156.
- 2026-11-23 (claude): started. Plan: `art/outfits.json` (data) and `scripts/outfits.mjs` (generator, exported for tests) run first by `npm run sprites`; torso rules from the route-test script; the cardigan (fern `e`, walnut `7` shade, tee `6`) as the one proof outfit, wired as a gift item.
- 2026-11-23 (claude): built, worktree ../sim-worktrees/158-outfit-generator.
  - Generator: `scripts/outfits.mjs` reads `art/outfits.json` (id, prefix, template, torso rule with outer/shade/inner palette keys, legs recolour map, hand-drawn row overlays per file) and writes 12 files per outfit into `art/src` with a GENERATED header, only when the text differs (re-run says "up to date"; `git status` clean after a second `npm run sprites`). Rules: `open-front`, `solid`. `package.json` `sprites` now runs it first.
  - The three hand-drawn outfits are untouched (a test checks they carry no header). New outfit: CARDIGAN AND TEE, `outfit-casual-cardigan`, style casual, `OUTFITS` index 4, gift on day 48, note "IT DOES UP. YOU HAVE DECIDED IT DOESN'T." The sprites differ from the experiment's only in palette: fern outer, walnut shade, instead of tan and oak.
  - Tests: `scripts/outfits.test.mjs` (12 files, 16x16, palette keys, header, checked in matches the data, only rows 7 to 11 change from the template, overlays, no stray generated file, hand outfits untouched). Two existing counts raised by one (`deliveries.test.ts` checkpoints 19 to 20, `checkpoints-stage-a.test.ts` gifts 22 to 23). Golden frames unchanged (no re-record).
  - Looked at it in the real game: dev server in the worktree, headless Chrome, the game's `Game` exposed on `window` by a scratch entry (deleted, not committed), the item owned and placed in the `worn` slot, then the real arrow keys held for each direction, captured at 3x. Down: white tee strip down the middle, fern cardigan either side with a dark walnut column between; reads as an open cardigan, clearly not the plain green sweater. Up: all fern with a walnut seam down the middle, clearly separate from the brown hair (the tan version merged). Left and right: the white tee shows as a strip at the front edge, a walnut line, then fern; walk frames alternate legs and arm swing without the torso breaking. The fern is close to the green of the plain casual sweater, so the two casual outfits are told apart mainly by the tee strip and seam. The walnut shade is nearly the outline colour, so from the front the V reads as a dark stripe.
  - Docs: `docs/art-style.md` 'Generated outfits' (how to add one, poses note), `docs/decor.md` 'What issue 158 built'.
  - Checks: `npm test` 175 files, 3981 pass; `npm run build` passes.
  - Not done / outside scope: the poses, the other eight outfits (issue 159), and no V-neck overlay for the cardigan (the data supports overlays; none added).
