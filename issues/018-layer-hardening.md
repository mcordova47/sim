---
id: 018
title: Layer hardening
status: todo
owner: claude
depends_on: [017]
---

## Goal
Close the gaps the second review of issue 017 found in how `Game` runs layers, before the polish features (009a to 009d) lean on them. The approved review found that a layer which does its own `ctx.save()`, translates or fades, and then throws before its own `restore()` (the usual particle or lighting pattern) leaves the camera transform shifted for the rest of the session, even though the game loop keeps running and the layer is removed. A plain drawing error is already handled; this case is not.

## Acceptance criteria
- A layer that calls `ctx.save()` and throws before its `restore()`, a layer that forgets a `restore()`, and a layer that calls `restore()` too many times cannot leave the world shifted, faded or otherwise changed for later layers, the popups, the prompt, the HUD or the next frame. Reset the canvas to the known frame state (identity transform, `globalAlpha` 1, `source-over` compositing) at the start of each frame and again right after the world pass, but only when some layer has a draw hook, so a game with no layers makes exactly the same draw calls as now.
- A test with a stateful fake canvas that tracks the transform through `save`, `restore` and `setTransform` proves each of those three cases, in `drawWorld` and in `drawHud`.
- `Layer` gets an optional `name`, and the "layer threw and was removed" message includes it, so a log line says which feature broke. Tests cover named and unnamed layers.
- The `Layer` doc comment states plainly that a layer must balance its own `save`/`restore`, what the game guarantees if one doesn't, and that a layer cannot move the camera (shake would need a camera API).
- Adding the same layer object twice is either ignored or documented. Pick one and test it.
- A replay against `main` (as done for 015 and 017) shows no change to the draw calls for a game with no layers or with layers that have no draw hooks.

## Notes
- From the review: a layer that throws is removed for the rest of the session, taking its other hooks with it. That is intended; the name in the log is the fix for it being hard to diagnose.
- Screen shake would need a camera API (`camera.shake`, or an offset the camera adds), not a layer. Leave it for the polish features to ask for if they want it.

## Progress log
