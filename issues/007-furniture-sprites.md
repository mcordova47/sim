---
id: 007
title: Furniture sprites
status: todo
owner: agent
depends_on: [005, 006]
---

## Goal
Draw sprites for each piece of furniture and fixture in the floor plan, based on Marc's photos.

## Photo handling
The furniture should look like Marc's real pieces, so work from the photos in `reference-photos/` (gitignored; read them from the main checkout by absolute path, since worktrees don't have them) together with `docs/floor-plan.md` and `src/game/room.ts`. Never copy or commit the photos, and don't write anything into the repo that identifies the address. The photos stay until this issue is done; Marc deletes them afterwards.

## Acceptance criteria
- One sprite per item in the inventory from issue 005, following `docs/art-style.md`.
- Each sprite looks recognizably like Marc's actual piece (color, shape, notable details).
- Rendered contact sheet reviewed by the agent before reporting done; Marc gives final approval.
- Work can be split into batches (kitchen, living area, sleeping area, small props), one agent per batch.

## Progress log
