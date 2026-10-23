---
id: 004
title: HUD and feedback
status: done
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
- 2026-10-22: **Review: approve.** Reviewer did not write the code. `npm test` 25 pass, `npm run build` passes. Independent checks (scratch harness outside the repo: esbuild bundle of the render code driven by a fake 2D context that rasterises to a PNG, which I viewed):
  - Score display and multiplier on screen: **pass**. Panel renders SCORE and COMBO; X1.0 grey, above 1.0 gold with a time bar. Score of 999999 ends at x=80, combo column starts at x=96, X3.0 ends at x=144, inside the panel (right edge 148). A score collides with the combo column only at 8 digits. HUD count-up converges for dt from 1/60 to 100 and targets 1 to 999999 with no overshoot, decrease or negative values (999999 takes 1.28s at 60fps).
  - Floating +N popup: **pass**. Lifetime 1.6s, alpha = min(1, (1.6 - age) / 0.4) stays in (0, 1], rise eases out to 18px, popups are removed at 1.6s. Driven by `onComplete` at the zone centre. See the minor note on edge clamping.
  - Progress bar during a timed task: **pass**. Checked all 30540 reachable player positions overlapping a zone (outside solids), at progress 0, 0.5 and 1: label and bar stay inside their box, the box is on screen, clear of HUD_BOX and the player.
  - Prompt does not overlap the HUD: **pass**. Same position sweep for all three interactables with cooldown labels of 0, 1, 9, 10, 99, 100 and 999: no offscreen pixels, no HUD overlap, no player overlap, text inside the box. Widest realistic prompt ("Lie down for a bit (999 SEC)") is 173px, fits the 320px screen.
  - Pixel font: **pass**. Built-in 5x7 glyph data (no external files), integer scales, smoothing off, integer coordinates. Every character in the game's strings has a glyph.
  - Scope: **pass**. Changes are only src/render/*, src/main.ts, the issue file, and `Scoreboard.multiplier` plus its test in src/game. `multiplier(now)` matched `award.multiplier` for an 8-task chain, caps at 3, returns 1 when expired or fresh, and uses the same inclusive window edge as `chainAlive`. PLAN.md and other issues untouched. No reference-photos content or personal details.
  - Visual feel in a browser: **user-reported, not verified by me**. Marc played it and says it looks good. I cannot run a browser; I only looked at rasterised stills.
  - Non-blocking findings (not criteria failures, for the planner or a later issue):
    - Popup horizontal clamp (20px each side) is too small for the widest line (REPEAT X0.50 is 71px, COMBO X3.0 is 59px), so popups centred at x<=35 or x>=285 clip off screen by up to 17px. A popup whose zone is within 18px of the top also clips. No placeholder zone triggers this (fridge centre is 276), but real floor plan tasks near the walls could.
    - After finishing a task the cooldown prompt (above the player) and the rising popup (from zone.y) overlap for part of the 1.6s. Cosmetic, not covered by the criteria.
    - `placeLabel` cannot clear the HUD for labels wider than about 164px when the anchor is under the HUD (6531 screen positions overlap at w=180). Not reachable with current task names; matters if long names are added.
