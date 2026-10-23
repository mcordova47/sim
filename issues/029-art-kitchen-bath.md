---
id: 029
title: Top-down art: kitchen and bath
status: todo
owner: agent
depends_on: [020, 025]
---

## Goal
Draw every top-down piece in the kitchen and the bath, to `docs/art-style.md` and the sizes in `src/game/apartment.ts`.

## Pieces (name, size in tiles)
- Kitchen: `counter` 3x2 (sink side), `dishes-0`, `dishes-1`, `dishes-2`, `dishes-3` (3x2, same footprint as `counter`: a clean counter and a pile that grows), `stove` 3x2 (burners on the top slice), `hood` 3x1, `fridge` 2x2 (draw to the footprint, with overhang if it needs height), `recycling` 1x1, `bin` 1x1, `boxes` 2x1, `tote` 1x1, `window-curtain` 1x2.
- Bath: `tub` 2x4 (long edge toward the player, with shower curtain), `toilet` 2x2, `vanity` 2x2 (sink and mirror).
- Any kitchen or bath tile or door piece the maps use that is missing (kitchen tile floor, doorways).

## Acceptance criteria
- Each sprite exists in `art/src/` with exactly that name and size, passes `npm run sprites`, palette only.
- The four dish stages read as a growing pile at 1x.
- Reuse and adapt side-view pieces where the audit says so; remove replaced side-view sprites once nothing refers to them.
- Contact sheet and a mockup of each room for Marc to look at, with how to view them in the log.
- Photos read by absolute path, never committed; nothing identifying.
- `npm test` and `npm run build` pass.

## Notes
- Do not wire the sprites into the game (issue 031).

## Progress log
