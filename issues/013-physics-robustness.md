---
id: 013
title: Physics robustness
status: done
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

- 2026-10-22 (claude, review): Verdict **approve**.
  - Large dt safe: pass. `update` slices at <= 1/60 s; checked with my own tests (scratchpad) at dt 0.1/0.25/0.5/1 s sideways into a thin wall from both sides, falling at dt 0.25/1/5 onto a floor, and a jump press inside a 0.25 s step (jumps once, only first slice sees the press, lands again; apex matches 15 fixed steps). Repo test file also covers it.
  - Overlap pushed out along shortest axis: pass. Swept 1000+ start positions across three mutually overlapping solids: none left overlapping; tiny penetrations resolve by the nearest side; dt 0 gives finite values.
  - Optional drop-through: skipped, allowed.
  - Jump height documented in `config.ts` (about 37.8px): pass.
  - Vitest suite: pass. `src/game/player.test.ts` has 20 tests (log says 19) covering landing, jump heights, coyote, buffering, one-way, corners. Against old `player.ts` 5 of them fail (large-step floor, step equivalence, three depenetration cases). The thin-wall/ceiling large-step tests pass on old code too, so they don't add protection.
  - Behaviour at exactly 1/60 s vs main: my differential test (main's player.ts vs branch, 1200 frames of scripted moves and jumps over floor, thin wall, one-way and ceiling) gives bit-identical x, y, vx, vy, grounded.
  - `npm test` 49 pass, `npm run build` ok. Scope: only player.ts, config.ts, player.test.ts and this issue file changed; no PLAN.md edits.
  - Unverified: feel in a browser (should be identical at 60 Hz given the equivalence test).
  - Note, not a failure: `resolveOverlaps` sets `grounded = true` when pushed up, which is fine but means a spawn-embedded player can jump on that frame.
  - PLAN.md table needs updating by the planner.
