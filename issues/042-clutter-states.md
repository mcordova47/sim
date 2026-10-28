---
id: 042
title: Clutter that moves (desk, dirty clothes, mail)
status: todo
owner: claude
depends_on: []
---

## Goal
From Marc's playtest: once the assets exist, "clean the desk" should cycle through states of where the clutter is, and the same idea for dirty clothes and mail. No real state changes beyond the look; it is a gag that rewards doing it.

## Acceptance criteria
- A small number of variants per object (desk piles in three or four arrangements; dirty clothes on the floor, chair, hamper; mail on the table, the counter, the shelf), each a sprite variant picked by a wrapping state variable, like `recordSort` in 035.
- Art for each variant, requested in a new art issue (an agent draws them); the code issue waits for the sprites.
- `tidy-desk` advances the desk arrangement; add dirty-clothes and mail tasks on the same pattern.
- Tests; `npm test` and `npm run build` pass.

- Marc's idea (2026-10-23): the floor tiles could have clean and dirty states too (dust, crumbs, a spill), cleaned by a sweep task. Same pattern: a wrapping or two-state variable and tile variants for each floor material. Include it, or split it out if it is large.

## Progress log
- 2026-10-28 (Marc): wants some clutter on the desk (an idea to include when this is picked up).
