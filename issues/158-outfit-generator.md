---
id: "158"
title: "Outfit generator: sprites from a small data entry"
short: "Outfit generator"
status: todo
owner: claude
depends_on: ["156"]
summary: "Generate an outfit's 12 sprites from a palette per region plus a torso rule, with a few hand-drawn rows on top."
kind: build
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
