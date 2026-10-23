---
id: 009c
title: "Polish: achievements and saved progress"
status: blocked
owner: agent
depends_on: [017]
---

## Goal
Give a game with no goal a pile of small, funny achievements, shown as toasts, and remember progress between visits.

## How this fits in
Issue 017 added `game.events` (typed events for jump, land, task start, task complete and task blocked) and `game.addLayer(...)` for extra update and drawing hooks. Build this feature as its own module that subscribes to those events and, if it draws, registers a layer. Add exactly one line to `src/game/features.ts` to switch it on. Do not edit `game.ts` unless the issue says so, and keep every colour from `render/colors.ts` and every number you may want to tune in `config.ts`. Other agents are building the other three polish features at the same time, so stay inside your own module.

Text drawn by the game uses the built-in pixel font (A-Z, 0-9 and `+ - * . , : ! ? ' ( ) / %`, uppercase). Anything the player reads must stick to those characters.

Keep it all testable without a browser: put the logic in plain functions and classes, and inject anything that touches the browser (audio, storage, a canvas) so tests can fake it.

## Acceptance criteria
- A single data file lists at least 15 achievements, each with an id, a funny name, a one-line description and a condition on tracked stats. They should be drawn from the real tasks (see `src/game/tasks.ts` and the flavor text), for example doing the same task three times (a "Doomscrolled three times" kind of name), doing every task in a room, a long variety chain, a big single award, repeating a task until it pays the minimum, jumping a lot, and finishing every task at least once.
- Stats are tracked from the game events (per-task counts, total points, best chain, jumps, and so on) in a separate plain module with tests.
- Toasts appear in screen space as a HUD layer: one at a time or a short stack, sliding in and out over a few seconds, never overlapping the HUD or each other, and never off screen. They use the pixel font and palette colours only, and every achievement name and description sticks to the characters the font has. A test checks all of them against the font's glyphs.
- Unlocked achievements, the best score and the lifetime stats are saved to `localStorage` under a versioned key. Storage is injected so tests use a fake; reads and writes are wrapped so a blocked or full storage never breaks the game, and the game works with no storage at all.
- A way to see what is unlocked: a simple key (for example Tab) shows a list screen or panel, with locked ones shown as "???" until earned. Keep it small and readable.
- A way to reset progress (a key combination that is hard to hit by accident, or a documented function), with a test.
- An achievement can only unlock once, even after reloads. Tests cover unlocking, not double-unlocking, saving, loading, and a corrupt saved value being ignored.
- Thresholds and toast timing live in the data file or `config.ts`.

## Notes
- Score persistence is optional in the original polish issue; here it means the best score and the unlocks. The running score still starts at 0 each visit.
- Marc will read these names, so make them good. They can be a little silly.

## Blocked on the top-down switch
On 2026-10-22 the game changed direction from a side-view platformer to a top-down, Pokemon-style game (issues 019 onward). Do not start this issue yet. It needs revisiting once the foundation (019) is in: the `jump` and `land` events no longer exist (they become `step` and `bump`), the particles and sounds the issue describes need to suit walking, and the day and night cycle should build on the clock from the apartment state (021). The planner will rewrite the affected criteria before releasing it.

## Progress log
