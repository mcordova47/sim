---
id: 009b
title: "Polish: particles"
status: todo
owner: agent
depends_on: []
---

## Goal
Small particle effects that make walking, doing tasks and the room's moods feel good, in the same restrained tone as the rest of the game. Marc approved the plan below (2026-10-23).

## How this fits in
The game is top-down (issues 019 onward). Events now are `step` and `bump` (no jump or land), `taskStart`, `taskComplete`, `taskCancelled`, `taskBlocked`, `stateChanged`, `room`, dialog open and close (`src/game/events.ts`). Build this feature as its own module (like 009a and 009d did: `src/game/particles/`) that subscribes to those events and registers a layer with `game.addLayer(...)`; add exactly one line to `src/game/features.ts`. Do not edit `game.ts` unless a small read-only getter is unavoidable, and say so in the log. Text drawn by the game uses the built-in pixel font; anything the player reads must stick to the font's characters. Keep it testable without a browser: plain functions and classes, with an injected random function and an injected canvas.

## Acceptance criteria
- **Walking:** a tiny dust puff at the feet on a step, varying by floor (wood and stone puff a little, tile in the bath none), nothing when tired and shuffling (energy below the tired line), and a small bump puff where the player runs into a wall (the `bump` event; the bump is latched, so check it does not spam).
- **Task completion:** a burst of whole-pixel squares from the task's zone when a task completes. Amount and colors grow with the chain length from the award; a long variety chain (3 or more) gets multicolor confetti from the palette; a repeat with diminishing returns gets a smaller, duller burst. Cancelled and blocked tasks produce nothing.
- **Task-specific effects:** steam over the table when you make coffee (and over the mug when it is waiting); bubbles rising from the sink for the dishes; a drifting `z` from the bed when you sleep or nap on the sofa; music notes from the guitar and from the record player while a record plays (a note every second or two, only while it plays); a sparkle at the award popup when the good hour icon shows (use the existing clock-icon moment). Each is data (a table in the module or `config.ts` keyed by task id) so adding one is one line.
- **Low mood:** a small sigh puff over the head when mood drops below the low line, matching the existing "SIGH..." popup (do not duplicate its text).
- Particles live in world space and draw inside the camera transform, as whole-pixel squares (no blur, no smoothing, no sub-pixel shimmer), using only palette colors. Day and night (009d): they are drawn after the lighting tint so sparkles stay visible at night, unless that reads badly; say which in the log.
- A fixed particle budget (for example 200 live): when full, new ones replace the oldest or are skipped. No growth over time and no per-frame garbage that matters.
- Randomness comes from an injected random function so tests are deterministic. The simulation (position, velocity, gravity or drift, lifetime) is plain code with a unit test for each effect and for the budget and expiry.
- Particles pause when the game does (dialogs open, tasks that lock the world) and use game time, like the popups. They never draw over a full-screen view (`view` pictures) or dialogs.
- Amounts, speeds, drift, lifetimes and colors live in `config.ts`.
- A recording-canvas test shows particles draw inside the camera transform and never draw once expired.
- Marc looks at it: render frames of walking, a coffee, the dishes, sleeping, guitar and a long chain, and tell Marc how to see each in the dev build.

## Note from the 018 review
The canvas reset between layers covers the transform, `globalAlpha` and the compositing mode only. A layer that sets `clip`, `shadowBlur`, `filter` or similar and doesn't balance its own `save`/`restore` can leave those set for the layers after it. Balance your own `save`/`restore` (the game also wraps each draw hook in one), and if this feature uses clipping, shadows or filters, say so in the progress log so the reset can be widened.

## Progress log
