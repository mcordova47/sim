---
id: 014
title: HUD polish
status: todo
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
