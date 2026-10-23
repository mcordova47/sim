---
id: 013
title: Physics robustness
status: todo
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
