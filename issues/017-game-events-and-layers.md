---
id: 017
title: Game events and drawing layers
status: todo
owner: claude
depends_on: []
---

## Goal
Sound, particles, achievements and the day/night cycle (issues 009a to 009d) all need to react to the same moments (a jump, a landing, a task starting or finishing) and to draw on top of the game. `Game` has no way to announce those moments or to host extra drawing, so four agents would each edit `game.ts` and collide. Add a small events and layers mechanism so each feature lives in its own file and plugs in with one line. No behaviour change on its own.

## Acceptance criteria
- A typed event emitter (`src/game/events.ts`) with at least these events and payloads: `jump`, `land` (with the impact speed, so a soft landing and a hard one can differ), `taskStart` (the task), `taskComplete` (the task and its award, including the chain length and multiplier), and `taskBlocked` (the task and why, for example cooldown, when the player presses interact and nothing starts). `on` returns an unsubscribe function.
- `Game` owns the emitter (`game.events`) and emits these from its update. `Player` or `Game` detects jump and land without changing how the player moves (a test shows the physics is unchanged).
- `game.addLayer(layer)` registers an extra layer with optional `update(dt)`, `drawWorld(ctx, camera)` (drawn inside the camera transform, after the player) and `drawHud(ctx)` (screen space, after the HUD). Layers update and draw in the order added.
- The existing popups and HUD keep working as they do now; they are not moved onto layers unless that is trivial.
- `src/game/features.ts` exports `attachFeatures(game)`, called once from `main.ts`, and is empty for now. Each polish issue adds one line to it, so merging them touches one line each.
- Tests cover the events (each fires once at the right moment, with the right payload, and not on ordinary frames) and the layers (order, update and both draw hooks), without a browser.
- Nothing about the look or the feel of the game changes. A recording-canvas comparison against `main`, as was done for 015, shows identical draw calls.

## Progress log
