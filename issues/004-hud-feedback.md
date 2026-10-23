---
id: 004
title: HUD and feedback
status: review
owner: claude
depends_on: [003]
---

## Goal
Make scoring visible and satisfying.

## Acceptance criteria
- Score display and current multiplier on screen.
- Floating "+N" popup at the object when a task completes.
- Progress bar over the player (or object) during a timed task.
- Interaction prompt rendering that doesn't overlap the HUD.
- Pixel font loaded from a bitmap font or web font, scaled crisply.

## Progress log
- 2026-10-22: Starting in worktree `../life-worktrees/004-hud-feedback`. Plan: a built-in 5x7 bitmap font (glyph data in code, no external assets or licences), `render/layout.ts` (pure label placement that avoids the HUD), `render/hud.ts` (score and combo, screen space), `render/world-ui.ts` and `render/popups.ts` (prompt, progress bar, +N popups, drawn at world positions so the camera in issue 010 can wrap them).
- 2026-10-22: Done, ready for review. Branch `issue/004-hud-feedback`, worktree `../life-worktrees/004-hud-feedback`.
  - Added `src/render/font.ts` (built-in 5x7 bitmap font, uppercase, integer scaling, optional drop shadow; glyphs pre-rendered per colour), `layout.ts` (`HUD_BOX` and `placeLabel`), `hud.ts` (score and combo), `popups.ts` (floating text), `world-ui.ts` (prompt and progress bar). `main.ts` now uses these and the debug HUD is gone. `Scoreboard.multiplier(now)` was added to `game/scoring.ts` so the HUD can show the current combo multiplier (the only change outside `render/` and `main.ts`).
  - Criteria:
    - Score display and current multiplier: top-left panel. Score counts up toward the real value; the multiplier turns gold above 1.0 with a bar showing the time left in the combo window.
    - Floating "+N" popup at the object on completion: popups rise from the task's zone and fade over 1.6s of game time. Extra lines show `COMBO X..` when the multiplier is above 1 and `REPEAT X..` when diminishing returns applied. Driven by the `onComplete` callback, not by polling.
    - Progress bar during a timed task: task name plus a bar, above the player.
    - Prompt rendering that doesn't overlap the HUD: `placeLabel` tries above the player, then below, then slides clear of the HUD. A test scans the screen for overlaps. Prompt shows `[E] name`, or the name greyed out with `(N SEC)` while cooling down.
    - Pixel font: built-in bitmap font, no external files. Drawn with smoothing off at integer scales (2x for the score and the `+N`).
  - Checks: `npm run build` passes. `npm test`: 25 pass (10 new in `render/render.test.ts`: glyph well-formedness and coverage of every character the game prints, text measuring, label placement including the HUD overlap scan, popup expiry; plus 1 new in `scoring.test.ts` for `multiplier`). I rendered the font to a PNG and looked at it: all letters, digits and punctuation are legible.
  - Fixes made while building: the first `placeLabel` could put a label on top of the HUD when the player was in the top-left (caught by the overlap test); popup lines were spaced for 1x text and would have collided with the 2x `+N`; the `(12S)` cooldown label read as `(125)`, so it now says `(12 SEC)`.
  - **Not checked in a browser:** how the HUD, popups and prompts actually look and feel in the running game (colours, spacing, readability over the room). Marc needs to play it.
  - Notes for the planner:
    - World-space UI (prompt, progress, popups) is drawn with world coordinates. The camera in issue 010 must convert these to screen coordinates; `main.ts` marks the spot. The HUD is screen space and needs no change.
    - HUD colours are local constants in `hud.ts`, `world-ui.ts` and `main.ts`. Issue 006 defines the shared palette; these should switch to it afterwards.
    - Text is uppercase only and covers A-Z, 0-9 and `+ - * . , : ! ? ' ( ) / %`. Task names or flavor text using other characters (e.g. `&`, `"`, `;`) will draw as `?`; the floor plan's task names should stick to that set, or the font gets extended.
