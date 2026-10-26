---
id: 066
title: Flattened boxes and collected packages are linked
status: review
owner: claude
depends_on: []
---

## Goal
Marc's idea (2026-10-26): tie two things together. Flattening the boxes in the kitchen draws the boxes as flat; collecting a package at the door unflattens them (the new package's box joins the stack).

## Acceptance criteria
- A saved state variable `boxes` (0 = flattened, 1 = a stack) with the stack as the default (today's look), tolerant of old saves. `flatten-boxes` sets it to 0 (and requires `boxes` to be 1, with the plain reason `NO BOXES TO FLATTEN`; it is offered only when there is a stack); collecting a package (the delivery box by the front door, issue 062 stage 3a: `collect-delivery`) sets it back to 1, so there is always something to flatten after a delivery. Decide and say whether several waiting packages build a taller stack (a count 0 to 3 with three sprites) or just one (recommended: just one, flat or stack).
- Art: `boxes` (today's stack) stays the stack; add `boxes-flat` (same 32x16 footprint, the boxes lying flat against the wall or on the floor, palette only, drawn from the real flattened boxes in `reference-photos/panty-and-boxes` by absolute path, never copied into the repo). The kitchen object picks the sprite by the `boxes` state like the dishes do (appearance variants); the golden frames for the kitchen (if recorded) and the sprite-exists test pass.
- The flatten-boxes task keeps its points, flavor and cooldown; its cooldown does not block the stack returning.
- Tests for the state rules (flatten, collect, old save), the task offering, the variants; docs in `docs/tasks.md` and `docs/state.md`; render the kitchen with both and look at it at 1x and 4x; `npm run sprites`, `npm test` and `npm run build` pass.

## Progress log

- 2026-10-26: started. Plan: state var `boxes` (default 1), `flatten-boxes` rules, `collectDeliveries` sets it to 1, a `boxes-flat` sprite, variants on the kitchen box object, tests, docs. Decision from Marc: just one state (flat or stack), no taller stacks.
- 2026-10-26: done, ready for review.
  - `boxes` added to `src/game/state-vars.ts` (initial 1, 0 to 1). There is no save of the apartment state in the game today; a state or save without the variable simply starts as a stack, and the game skips the reset if the variable is missing (tested).
  - `flatten-boxes` in `src/game/tasks.ts`: requires `boxes` 1 (`NO BOXES TO FLATTEN`), sets 0. Points, flavor and cooldown untouched.
  - `Game.collectDeliveries` (`src/game/game.ts`) sets `boxes` to 1 when a package was actually opened. It does not touch the flatten cooldown, which only holds back the task.
  - Kitchen object `X` in `src/game/apartment.ts` has variants `boxes` (when `boxes` 1) and `boxes-flat`.
  - New `art/src/boxes-flat.sprite` (+ `public/sprites/boxes-flat.png`), 32x16, palette only: one flattened sheet leaning on the wall and a thin pile of flat sheets on the floor, the same pantry tub on the right as the stack. Drawn from the flat cardboard sheets in `reference-photos/panty-and-boxes.jpg` (read by absolute path, not copied). The photo has no neat flat pile, so this is a simplified reading.
  - Tests: `src/game/boxes.test.ts` (state, old state, flatten and refusal, collect, cooldown, several packages, variants). The existing sprite-exists test in `apartment.test.ts` covers the new variant sprite. Docs: `docs/state.md`, `docs/tasks.md`.
  - Golden frames: not re-recorded. They record only the main room, the kitchen is not in them, and the test still passes unchanged.
  - Checked: rendered the kitchen with both states at 1x and 4x (headless mockup script, outputs outside the repo) and looked at them. `npm run sprites`, `npm test` (1814 pass) and `npm run build` pass.
  - Not checked: how it feels in a browser. Try `npm run dev`, kitchen, then `?set=boxes:0` for the flat look, and Flatten the boxes then open a package (`?deliver=test` in dev) to see the stack return.
