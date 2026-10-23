---
id: 017
title: Game events and drawing layers
status: review
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
- 2026-10-22: Done, ready for review. Branch `issue/017-game-events-and-layers`, worktree `../life-worktrees/017-game-events-and-layers`.
  - Added `src/game/events.ts` (`GameEvents` and a typed `Emitter`: `on` returns an unsubscribe, a throwing listener is logged and skipped, listeners may unsubscribe while being called), `src/game/features.ts` (`attachFeatures(game)`, empty, called once from `main.ts`), and tests `events.test.ts`, `player-events.test.ts`, `game-events.test.ts`. `Game` now owns `events`, exposes `addLayer(layer)` (returns a remover; `Layer` has optional `update`, `drawWorld` and `drawHud`) and emits the events. `Player` gained two read-only per-update flags, `jumpedThisUpdate` and `landingSpeed`. `InteractionSystem` gained optional `onStart` and `onBlocked` hooks beside the existing completion callback. `config.ts` gained `EVENTS.minLandSpeed` (40 px/s).
  - Criteria:
    - Typed emitter with `jump`, `land` (speed), `taskStart`, `taskComplete` (task and award with chain and multiplier) and `taskBlocked` (task and reason); `on` returns an unsubscribe: yes, covered by `events.test.ts`.
    - `game.events`, emitted from update; jump and land detected without changing how the player moves: the flags are only written, never read by the physics. The 96 existing tests, including the 20 player physics tests, pass untouched. Beyond that, I replayed the same randomised inputs (9,000 updates, rendering every second frame, ending at a score of 1,499) through `main`'s `Game` and this branch's `Game` with a recording canvas: player position, score, camera and an md5 of every draw call were identical on all 4,500 sampled frames.
    - `addLayer` with `update(dt)`, `drawWorld(ctx, camera)` inside the camera transform after the player, and `drawHud(ctx)` after the HUD, in the order added: yes; tests check update order and step size, the order of draw calls against `save`/`translate`/`restore`, that layers get the camera position, that hooks are optional, that removal works, and that having a layer that does nothing changes no draw call.
    - Popups and HUD untouched: yes, they are not on layers.
    - `features.ts` with one line per feature: yes (a commented example line).
    - Events fire once, at the right moment, with the right payload, and not on ordinary frames: yes. Tests cover settling at spawn and walking (no events), a jump (once, and not again for a press in mid-air), a landing (once, with a speed near what a 38 px fall gives), task start and complete with payloads, a refused press during cooldown (once per press, not when nothing is in reach), a zero-length task (start then complete), and a throwing listener.
  - Decisions to know about:
    - `land` is only announced above `EVENTS.minLandSpeed` (40 px/s). The player starts with `grounded` false, so the first frame at spawn is technically a touchdown at 15 px/s; the threshold keeps that and tiny steps down from being announced.
    - `taskBlocked` fires on the frame of a fresh interact press when the task in reach is cooling down and nothing started. With the 0.15 s press buffer from issue 012, a press just before a cooldown ends can emit `taskBlocked` and then start the task a few frames later; this is rare and harmless.
    - `Player` reports the hardest landing inside one `update` call, so a long step (issue 013 sub-steps it) still announces one landing.
  - Checks: `npm run build` passes; `npm test` 123 pass (96 existing plus 27 new).
  - Not checked in a browser: nothing visible changes, but I haven't run it there.
