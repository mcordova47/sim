---
id: 009b
title: "Polish: particles"
status: todo
owner: agent
depends_on: [017]
---

## Goal
Add small particle effects that make movement and task completion feel good: dust when you land, and a burst when you finish a task.

## How this fits in
Issue 017 added `game.events` (typed events for jump, land, task start, task complete and task blocked) and `game.addLayer(...)` for extra update and drawing hooks. Build this feature as its own module that subscribes to those events and, if it draws, registers a layer. Add exactly one line to `src/game/features.ts` to switch it on. Do not edit `game.ts` unless the issue says so, and keep every colour from `render/colors.ts` and every number you may want to tune in `config.ts`. Other agents are building the other three polish features at the same time, so stay inside your own module.

Text drawn by the game uses the built-in pixel font (A-Z, 0-9 and `+ - * . , : ! ? ' ( ) / %`, uppercase). Anything the player reads must stick to those characters.

Keep it all testable without a browser: put the logic in plain functions and classes, and inject anything that touches the browser (audio, storage, a canvas) so tests can fake it.

## Acceptance criteria
- Landing dust: a few small puffs at the player's feet, scaled by the impact speed from the `land` event (nothing for a tiny hop).
- Completion burst: small squares fly out from the task's zone when a task completes. Amount and colours grow with the chain length from the award; a long variety chain (3 or more) gets confetti in several palette colours. A repeat with diminishing returns gets a smaller, duller burst.
- Particles live in world space and draw inside the camera transform, as whole-pixel squares (no blur, no smoothing, no sub-pixel shimmer), using only palette colours.
- A fixed particle budget (for example 200 live particles): when it is full, new ones replace the oldest or are skipped. No growth over time and no per-frame garbage that matters.
- Randomness comes from an injected random function so tests are deterministic. The simulation (position, velocity, gravity, lifetime) is plain code with a unit test for each effect and for the budget, and a test that particles expire.
- Particles pause when the game does and use game time, like the popups.
- Amounts, speeds, gravity, lifetimes and colours live in `config.ts`.
- A recording-canvas test shows particles draw inside the camera transform and never draw once expired.

## Progress log
