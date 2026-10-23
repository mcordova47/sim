---
id: 013
title: Physics robustness
status: review
owner: claude
depends_on: []
---

## Goal
Fix the minor findings from the review of issue 002 so the player physics doesn't break on unusual input. Nothing here shows up today because the loop always steps at a fixed 1/60 s.

## Acceptance criteria
- `Player.update` is safe for a large `dt`: either it sub-steps internally or clamps to a safe maximum, so a step of 0.25 s doesn't fall through floors or thin walls. A test proves it.
- A player placed overlapping a solid (bad spawn, or a future moving platform) is pushed out predictably along the shortest axis and never through a wall. A test proves it.
- Optional, only if Marc wants it: drop through one-way platforms by pressing down and jump.
- The effective jump height is documented in `config.ts` (about 37px for `jumpHeight: 40`), or `jumpHeight` is adjusted so the real apex matches the intended one.
- The player physics gets a proper vitest suite in the repo covering the checks that were previously run from throwaway scripts (landing, jump heights, coyote, buffering, one-way platforms, corners).

## Progress log

- 2026-10-22 (claude): Plan: sub-step `Player.update` at <= 1/60 s, depenetrate at the start of each update, document the real jump apex, add a vitest suite for the player. Skipping the optional drop-through (Marc hasn't asked for it).
- 2026-10-22 (claude): Done.
  - `src/game/player.ts`: `update` splits `dt` into slices of at most `TIMESTEP` (a 1/60 s frame is exactly one slice, so normal behaviour is unchanged; `jumpPressed` is only seen by the first slice). New `resolveOverlaps` runs first: pushes the player out of any overlapping non-one-way solid along the least-penetration axis (ties: up, then sideways), zeroes velocity into the push, up to 4 passes for neighbouring solids.
  - `src/game/config.ts`: comment now states the real apex, about 37.8px (measured) for `jumpHeight: 40`. Left `jumpHeight` as is.
  - `src/game/player.test.ts` (new, 19 tests): landing, jump height and short hop, coyote (inside and outside the window), jump buffer, one-way platforms, walls/ceilings/corner, 0.25 s steps (floor, thin wall, thin ceiling, equivalence with fixed steps), starting inside solids (wall sides, floor, thin wall, wedged between two, one-way ignored).
  - Checks: `npm test` 49 pass; `npm run build` ok. With the old `player.ts`, 5 of the new tests fail (large-step floor, step equivalence, three depenetration cases), so they do test the change.
  - Not done: optional drop-through one-way platforms. Not checked: how it feels in a browser (should be identical at 60 Hz).
