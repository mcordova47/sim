---
id: 066
title: Flattened boxes and collected packages are linked
status: todo
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
