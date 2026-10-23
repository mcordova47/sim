---
id: 019
title: Top-down foundation (grid steps, facing, interact)
status: todo
owner: claude
depends_on: []
---

## Goal
Switch the game from a side-view platformer to a top-down, Pokemon-style game: the player walks tile to tile, faces a direction and presses the interact key on whatever is in front of them. Keep everything that is not about the view (loop, input, camera, HUD, font, popups, scoring and combos, task events and layers, palette, sprite loader, tests). Replace the platformer-only parts. This is a real foundation, not a throwaway, and it ends in a decision gate: Marc plays it and says whether the direction feels right before the rest of the pivot (020 onward) starts.

## Acceptance criteria
- **Controls:** four directions (WASD or arrows) and interact (E). The jump controls go.
- **Grid steps:** the player always stands on a tile (16 px). Pressing a direction you are not facing first turns you to face it; holding it then steps. A step takes `stepTime` (about 0.16 s) with smooth movement between tiles for drawing. Holding a direction keeps stepping with no gap; changing direction mid-hold is handled at the next tile; no diagonal movement. Timings live in `config.ts`.
- **Collision:** tile-based, from the level's solid rectangles snapped to the grid (and the map edge). Walking into something is a bump: you stay put, and the bump is announced once, not every frame. No gravity.
- **Interaction target:** the player interacts with the object on the faced tile. `Interactable` zones become tile rectangles that can be used from an adjacent faced tile. `InteractionSystem` uses the faced tile and drops the "grounded" rule. The prompt appears when facing something you can use. The buffered press, cooldowns, blocked press, scoring, combos, popups and HUD keep working, with their tests adapted.
- **Events:** `jump` and `land` are replaced by `step` (the tile and direction) and `bump` (the blocked tile). `turn` is optional. Update the event types, tests and the notes in `features.ts`.
- **Camera:** the existing camera follows the player on maps bigger than the view and holds still on a map that fits. Whole-pixel drawing is kept.
- **A placeholder level:** one room of rectangles (walls, a few furniture blocks, three placeholder tasks such as fridge, sink and bed), the player as a rectangle with a facing marker. Draw order is by row (y) so tall things overlap correctly once there is art.
- **Remove what no longer applies:** the platformer physics and its tests, `reach.ts`, and the side-on floor-plan conversion and data. Nothing in the repo may be left dead or half-working. They stay in git history and the `side-view-prototype` tag. Side-view sprites may stay in `public/sprites/` until the art issues replace them, but nothing may depend on them.
- **Tests (no browser):** turn before step; a held key keeps stepping; direction change; blocked move bumps once; no diagonals; map edges; the faced tile is the target (facing away or diagonal does nothing); step and bump events fire once per tile or bump and never on idle frames; the camera still behaves; scoring and interaction behave as before.
- `npm run build` and `npm test` pass. A recording-canvas replay is not expected to match `main` (behaviour changes on purpose), but the HUD, popups and prompt draw calls should match for the same state.

## Decision gate
When this is done and reviewed, Marc plays it and says continue, adjust or stop. Do not start 020, 021, 022 or 023 until then. The interview (024), the art spec (025) and layer hardening (018) do not depend on it and can run now.

## Progress log
