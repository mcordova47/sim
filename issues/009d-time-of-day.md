---
id: 009d
title: "Polish: time of day"
status: blocked
owner: agent
depends_on: [017]
---

## Goal
Give the apartment a sense of time: lighting that changes through the day, a clock, and tasks that pay better at the right hour (coffee in the morning, cooking in the evening). Marc approved the day and night cycle.

## How this fits in
Issue 017 added `game.events` (typed events for jump, land, task start, task complete and task blocked) and `game.addLayer(...)` for extra update and drawing hooks. Build this feature as its own module that subscribes to those events and, if it draws, registers a layer. Add exactly one line to `src/game/features.ts` to switch it on. Do not edit `game.ts` unless the issue says so, and keep every colour from `render/colors.ts` and every number you may want to tune in `config.ts`. Other agents are building the other three polish features at the same time, so stay inside your own module.

Text drawn by the game uses the built-in pixel font (A-Z, 0-9 and `+ - * . , : ! ? ' ( ) / %`, uppercase). Anything the player reads must stick to those characters.

Keep it all testable without a browser: put the logic in plain functions and classes, and inject anything that touches the browser (audio, storage, a canvas) so tests can fake it.

## Acceptance criteria
- A game clock that advances with game time (not wall time), so it pauses with the game. How fast a day passes, and the start time, live in `config.ts`. One full day is about a few minutes by default.
- Lighting that changes with the hour: a tint over the world (and a softer one over the HUD, or none) that moves through night, dawn, day and dusk, using only palette colours with alpha. It is drawn as a layer inside the camera transform, after the world. The window sprites make a nice place for extra light, but that is optional.
- A small clock readout in the HUD area that never overlaps the score and combo panel, in the pixel font.
- Task bonuses: tasks gain an optional list of good hours in the data (`src/game/tasks.ts`), and finishing one at a good hour multiplies its points by a configured amount. Add sensible hours to the real tasks (for example make the bed and coffee in the morning, cooking and dinner in the evening, a shower in the morning or evening). The prompt for a task shows a short hint when it is a good time. The change to scoring is small and goes through one clear hook (for example a points modifier on the scoreboard or interaction system); that hook is the one place this issue may touch `scoring.ts` or `interaction.ts`, with tests, and everything else stays in its own module.
- The award popup says when the time bonus applied, with text the font can draw.
- Tests (no browser): the clock wraps correctly and pauses with the game, the tint for each hour is a valid palette colour with an alpha in range and changes smoothly across the day, the bonus applies only inside its hours (including windows that wrap past midnight), and the hint appears only at good hours.

## Notes
- Be careful that lighting never makes the game hard to read. Night should be moody but the prompts, HUD and furniture must stay legible.
- Marc wants this in the game (decided 2026-10-22).

## Note from the 021 review
The clock now lives in the apartment state (issue 021: `CLOCK` in `config.ts`, the `clock` variable, `formatClock`). Build the lighting on that clock, not on a new one. Its `stateChanged` event fires when the rounded value changes (about 25 times a day, with an extra one at midnight), so do not rely on it for exact hours; issue 027 decides what this feature can rely on. Read the exact time each frame if you need a smooth tint.

## Blocked on the top-down switch
On 2026-10-22 the game changed direction from a side-view platformer to a top-down, Pokemon-style game (issues 019 onward). Do not start this issue yet. It needs revisiting once the foundation (019) is in: the `jump` and `land` events no longer exist (they become `step` and `bump`), the particles and sounds the issue describes need to suit walking, and the day and night cycle should build on the clock from the apartment state (021). The planner will rewrite the affected criteria before releasing it.

## Progress log
