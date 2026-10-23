---
id: 015
title: Extract the game scene from main.ts
status: done
owner: claude
depends_on: []
---

## Goal
`src/main.ts` is the file every issue touches (004, 006, 010, 011, 009), and parallel branches already conflicted there once. Move the scene into its own module so `main.ts` stays a thin entry point and later work lands in separate files. No behavior change.

## Acceptance criteria
- `main.ts` only creates the canvas, keyboard and game, and starts the loop.
- A `Game` (or scene) module under `src/game/` owns the player, interaction system, popups, HUD and the update/render functions. It takes its room data (solids, interactables, spawn) as constructor input rather than importing the placeholders directly, so issue 011 can swap in the real data from one place.
- Rendering is split so world drawing (solids, zones, player) and UI drawing (prompts, popups, HUD) are separate functions, ready for the camera in 010 to wrap the world pass.
- Behavior is identical: same controls, same visuals, same scoring. `npm run build` and `npm test` pass.
- At least one test covers the new module without a browser (for example, driving `update` with simulated controls and checking the player moves and a task completes).

## Progress log
- 2026-10-22: Done, ready for review. Branch `issue/015-extract-game-scene`, worktree `../life-worktrees/015-extract-game-scene`.
  - Added `src/game/level.ts` (`Level` type and `PLACEHOLDER_LEVEL`), `src/game/game.ts` (`Game`: owns the player, interaction system, popups and HUD; `update(dt, controls)` and `render(ctx, alpha)`), `src/game/game.test.ts`. `src/main.ts` is now 21 lines: canvas, keyboard, `new Game(PLACEHOLDER_LEVEL)`, loop.
  - Criteria: `main.ts` thin: yes. `Game` takes a `Level` (solids, interactables, spawn) so issue 011 swaps data in one place: yes. Render split into `drawWorld`, `drawWorldUi`, `drawHud`, with a comment marking where the camera in 010 wraps the first two: yes. Same behavior: the update and draw code moved without changes (same order of calls, same constants); `Game` doesn't read the keyboard, `main.ts` does and then calls `keyboard.endFrame()` as before. Test without a browser: `game.test.ts` (4 tests: settles on the floor, moves with input, locks during a task then awards points, runs without a canvas).
  - Checks: `npm run build` passes; `npm test` 29 pass (25 existing plus 4 new).
  - **Not checked:** pixel-for-pixel identical rendering against `main` in a browser; the draw code was moved, not changed, but nobody has compared the two visually.
- 2026-10-22: **Review (independent): APPROVE.**
  - Scope: `git diff main...issue/015-extract-game-scene` touches only `src/main.ts`, `src/game/{game,level,game.test}.ts` and this issue file. No PLAN.md or other issue edits. Merge with current `main` is clean (main has moved on with 007 split/016 docs only).
  - Criterion 1, `main.ts` thin: pass. 21 lines: canvas, `createScreen`, `Keyboard`, `new Game(PLACEHOLDER_LEVEL)`, `startLoop`.
  - Criterion 2, `Game` under `src/game/` owning player, interaction, popups, HUD, update/render, with room data via constructor: pass. `game.ts` has no placeholder imports (grep) and no keyboard/loop/window/document use; only the `Level` type reaches it. `PLACEHOLDER_LEVEL` is wired in `main.ts` alone.
  - Criterion 3, render split: pass. `drawWorld` (solids, zones, player, eye), `drawWorldUi` (progress/prompt, popups), `drawHud`. Order matches old `main.ts`: clear, solids, zones, player, eye, UI, popups, HUD.
  - Criterion 4, identical behaviour: pass (see differential test). `npm run build` passes; `npm test` 29/29 pass.
  - Criterion 5, browserless test: pass. `game.test.ts` drives `update` with simulated controls (floor settle, movement, task lock then 20 points).
  - Differential test (outside repo, not committed): bundled old `main.ts` (from `main`) and new `main.ts` with esbuild for node; shimmed window/document/rAF/performance; drove both through the real `Keyboard`, `readControls` and `startLoop` with the same key events (directed walk, repeated interact at the dishes zone for cooldown and diminishing returns, jumps, then about 21,000 frames of seeded random keys, blur events, jittery frame times and occasional long frames). A recording 2D context (including the glyph offscreen canvases) logged every call and property set. Result: 30,000 frames, 0 differing frames (about 5,000 distinct frames; combo, repeat and points popups all drawn). A deliberately mutated copy of the new bundle was detected, so the harness is sensitive.
  - Not verified: a real browser run or a human look at it; the user has not played this branch. The fake context compares draw calls, not pixels, but identical call streams imply identical pixels.
  - Out-of-scope: none. PLAN.md table needs updating by the planner (015 to done).
