---
id: 007
title: Furniture sprites
status: done
owner: marc + claude
depends_on: [007a, 007b, 007c, 007d]
---

## Goal
Draw sprites for each piece of furniture and fixture in the floor plan, based on Marc's photos.

This is the umbrella issue. The work is split into four parallel batches so agents don't edit the same files: [007a](007a-sprites-west-main-room.md) (bed, bookshelf, desk and their decor), [007b](007b-sprites-east-main-room.md) (table, record stand, sofa), [007c](007c-sprites-kitchen-west.md) (tote, bin, stove, counter) and [007d](007d-sprites-kitchen-east-and-bath.md) (boxes, fridge, spice rack and the bathroom). This issue is done when all four are merged and Marc has approved the whole set together.

## Photo handling
The furniture should look like Marc's real pieces, so work from the photos in `reference-photos/` (gitignored; read them from the main checkout by absolute path, since worktrees don't have them) together with `docs/floor-plan.md` and `src/game/room.ts`. Never copy or commit the photos, and don't write anything into the repo that identifies the address. The photos stay until this issue is done; Marc deletes them afterwards.

## Acceptance criteria
- One sprite per item in the inventory from issue 005, following `docs/art-style.md`.
- Each sprite looks recognizably like Marc's actual piece (color, shape, notable details).
- Rendered contact sheet reviewed by the agent before reporting done; Marc gives final approval.
- The full set looks consistent side by side (same materials, outlines and lighting). Check this once all batches are merged, and fix mismatches in a follow-up.

## Progress log
- 2026-10-22: Marc reviewed the full contact sheet (all four batches plus the player frames merged) and approved the set. Closed. `reference-photos/` can now be deleted, along with any converted copies the sprite agents made in temp folders.
