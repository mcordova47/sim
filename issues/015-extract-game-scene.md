---
id: 015
title: Extract the game scene from main.ts
status: todo
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
