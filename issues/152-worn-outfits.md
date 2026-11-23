---
id: "152"
title: "Worn outfits: change clothes at the nightstand"
short: "Worn outfits"
status: review
owner: claude
depends_on: ["151"]
summary: "Outfits become decor items worn from a non-map slot, changed at the nightstand."
kind: build
unverified:
  - "How the clothes list and the preview look in a browser, and how the THINGS page looks with the outfit sprites, were not seen."
---

## Goal
Build step B of `docs/decor-expansion-design.md` (section 5, engine piece P6): the three drawn outfits (casual, out, pajamas; 36 sprites already exist) become items of kind `outfit` in a slot `worn` that is not drawn on the map, changed at the nightstand by a task `swap-worn` ('Change clothes'), only offered when another outfit is owned. They arrive as gifts. The `outfit` state variable becomes derived from the slot. Marc (2026-11-23, decision d3 of issue 148): yes, and the poses staying in everyday clothes is a known bug filed as issue 150 (not fixed here).

## Acceptance criteria
- Slot `worn` (default `outfit-home`), items for the three outfits with deadpan notes and `from`, THINGS shows each by its idle-down sprite; `decor.test.ts`'s pinned slot list and main-room slot check are updated so non-map slots are exempt.
- `outfit` is derived each frame (like `parcel`); nothing else writes it; sleeping does not change clothes.
- A fresh game is unchanged (golden frames); the three outfits arrive through delivery checkpoints at days after the existing ones (state the days in the issue; Marc can change them).
- New strings are added to docs/text-review.md. Standard checks pass. Update docs/decor.md.

## Progress log
- 2026-11-23 (planner): filed on main from Marc's answers to issue 148 (decor expansion design note).
- 2026-11-23 (claude): built it. Plan was: a `worn` slot (new `offMap` flag so the main-room slot test exempts it), four `outfit` items (home is a starting thing; casual, out and pajamas are gifts), `Game.syncOutfit` deriving `outfit` from `decor.shownIn("worn")`, `swap-worn` on the nightstand named "Change clothes".
  - **Gift days chosen:** casual day 39, out day 42, pajamas day 45 (after the plants, last at day 36). Marc can change the numbers in `delivery-checkpoints.ts`.
  - Files: decor-data.ts, delivery-checkpoints.ts, apartment.ts (nightstand lists `swap-worn`), game.ts (`syncOutfit`), outfits.ts (`outfitFromItem`), tasks.ts and state-vars.ts (wording), docs/decor.md, docs/text-review.md, new `decor-worn.test.ts`; tests updated for the new counts (seven starting things, 22 gifts, 19 checkpoints), the pinned slot list, and poses.test.ts (outfit now set through the slot, since a direct write is put back).
  - Choices: the `outfit` variable follows what the room shows, so the highlighted outfit is on the player while the list is open (a preview, undone on Escape). A fresh game's THINGS page now has a seventh entry, the everyday clothes (that is the default item of the slot). The swap prompt for the `outfit` kind changed from the placeholder "Change the outfit" to "Change clothes" as the issue says. Notes are new deadpan lines, listed in text-review.md.
  - Checked: `npm test` all pass (golden frames unchanged), tsc, build. Not seen: the list and THINGS in a browser.
