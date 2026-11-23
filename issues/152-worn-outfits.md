---
id: "152"
title: "Worn outfits: change clothes at the nightstand"
short: "Worn outfits"
status: todo
owner: claude
depends_on: ["151"]
summary: "Outfits become decor items worn from a non-map slot, changed at the nightstand."
kind: build
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
