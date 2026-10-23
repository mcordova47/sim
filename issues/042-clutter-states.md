---
id: 042
title: Clutter that moves (desk, dirty clothes, mail)
status: todo
owner: claude
depends_on: [034]
---

## Goal
From Marc's playtest: once the assets exist, "clean the desk" should cycle through states of where the clutter is, and the same idea for dirty clothes and mail. No real state changes beyond the look; it is a gag that rewards doing it.

## Acceptance criteria
- A small number of variants per object (desk piles in three or four arrangements; dirty clothes on the floor, chair, hamper; mail on the table, the counter, the shelf), each a sprite variant picked by a wrapping state variable, like `recordSort` in 035.
- Art for each variant, requested in a new art issue (an agent draws them); the code issue waits for the sprites.
- `tidy-desk` advances the desk arrangement; add dirty-clothes and mail tasks on the same pattern.
- Tests; `npm test` and `npm run build` pass.

## Progress log
