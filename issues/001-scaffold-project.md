---
id: 001
title: Scaffold project
status: review
owner: claude
depends_on: []
---

## Goal
Set up a Vite + TypeScript project that renders a canvas and runs a fixed-timestep game loop.

## Acceptance criteria
- `npm run dev` serves a page with a canvas scaled to fit the window, with crisp pixel scaling (no smoothing).
- Fixed-timestep update loop with a separate render step.
- Keyboard input module that tracks held and just-pressed keys.
- `src/` layout: `main.ts`, `game/`, `input/`, `render/`, `assets/`.
- `.gitignore` and a short `README.md` with run instructions.

## Progress log
- 2026-10-22: Starting. Vite + TypeScript, 320x192 internal canvas (20x12 tiles of 16px), integer-scaled with pixelated rendering.
- 2026-10-22: Done, ready for review. Added `package.json`, `tsconfig.json`, `index.html`, `README.md` and `src/` (`main.ts`, `game/config.ts`, `game/loop.ts`, `input/keyboard.ts`, `render/canvas.ts`, `assets/`). `.gitignore` already existed.
  - Checked: `npm run build` passes (tsc strict + vite build). Dev server returns 200 for `/` and `/src/main.ts`.
  - **Not checked in a browser:** scaling crispness, the loop actually running, and key states showing on screen. Needs a manual look at `npm run dev` (hold A/D/Space/E and confirm the label updates).
  - Placeholder scene in `main.ts` is throwaway and gets replaced in 002.
