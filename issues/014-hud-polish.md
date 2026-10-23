---
id: 014
title: HUD polish
status: review
owner: claude
depends_on: [010, 011]
---

## Goal
Fix the minor findings from the review of issue 004. None show with the placeholder room; they would with the real floor plan, whose tasks sit near walls and have longer names.

## Acceptance criteria
- Popups never clip off screen: the horizontal clamp uses the popup's real width (the widest line, such as `REPEAT X0.50`, is about 71px), not a fixed 20px. Popups from zones near the top of the screen shift down or sideways instead of drawing above the screen edge. Needs the camera from 010, since screen position depends on it.
- The cooldown prompt and a rising `+N` popup don't draw over each other in the 1.6s after a task finishes (for example by offsetting one, or hiding the prompt while the popup is young).
- `placeLabel` handles labels wider than about 164px when the anchor is under the HUD, or task names and prompts are limited to a length that always fits. Check against the real task list from 005 (`src/game/tasks.ts`).
- Task names, prompts and flavor text in the real data only use characters the font has (A-Z, 0-9 and `+ - * . , : ! ? ' ( ) / %`), or the font is extended. Add a test over the real data.
- HUD colours come from the shared palette defined in 006 instead of local constants in `hud.ts`, `world-ui.ts` and `main.ts`.
- Each fix has a unit test where it can.

## Progress log
- 2026-10-22: Done, ready for review. Branch `issue/014-hud-polish`, worktree `../life-worktrees/014-hud-polish`.
  - Changed `render/layout.ts` (new `fitBox`; `placeLabel` gained a fallback strip under everything it must avoid), `render/popups.ts` (sizes popups from their real text; new `boxes()`), `render/world-ui.ts` (labels take extra boxes to avoid; exported `promptSize`/`progressSize`), `render/hud.ts`, `render/font.ts`, `render/sprites.ts` and `game/game.ts` (colours), plus new `render/colors.ts`. `tsconfig.json` gained `resolveJsonModule` so `colors.ts` can read `art/palette.json`.
  - Criteria:
    - Popups never clip: popup size is measured from its real widest line and height, then `fitBox` keeps it on screen and out of the HUD (shortest move: beside the HUD or below it). Tests sweep x from 0 to 400 and y from 0 to 192 at three ages with the widest real popup lines; every box stays fully on screen. Also tested: popups out of the HUD, and boxes follow the camera origin.
    - Prompt and popup overlap: `Game` passes the live popup boxes to `drawPrompt`/`drawProgress`, which avoid them (and the HUD). Rendered the frame just after completing doomscroll: `+40` floats at the sofa and the next available prompt sits below the player, not on the popup.
    - Wide labels: `placeLabel` now falls back to the strip under the HUD when a label is too wide to slide beside it. Tests sweep a 200px label across the screen against the HUD. Real labels: four cooldown labels (the humidifier one is 185px) are wider than the 164px beside the HUD, so the fallback is exercised by real data; a test asserts that, and another sweeps every real label (prompt, cooling-down and progress forms) over the screen against the HUD. Nothing is shortened. I first wrote a "must fit beside the HUD" test, saw it fail on those four, and replaced it: the requirement is not overlapping the HUD, not a width.
    - Font coverage: a test checks names, prompts and flavor for every task. All characters were already covered (no data or font changes needed).
    - Shared palette: new `render/colors.ts` builds `COLOR` from `art/palette.json` by name; HUD, labels, popups, font defaults, sprite fallback and the placeholder world colours all use it. A test scans every non-test source file and fails if a colour literal or `rgba(` appears outside `colors.ts` (I checked it does fail on an injected literal). Side effects: placeholder solids, one-way platforms and the combo callout changed shade slightly to the nearest palette colour (the placeholder world rectangles go away in issue 016).
  - Checks: `npm run build` passes; `npm test` 96 pass (80 existing plus 16 new).
  - **Not checked in a browser:** how the new colours and label positions look in motion.
  - Notes for the planner: popups can now be moved by `fitBox` as they rise, so a popup near the HUD may jump from beside it to below it. Rare; judge it in play. 016 should replace the placeholder world colours and drop the translucent zone rectangles.
