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
- 2026-10-22 **Review (independent, reviewer is not the author): CHANGES NEEDED.** Reviewed branch `issue/001-scaffold-project` at fe6be7e in its worktree after `npm install`.
  - Criterion 1, `npm run dev` serves a canvas scaled to fit with crisp pixels: **can't verify in a browser.** Evidence: dev server on port 5199 returned 200 for `/` and served `/src/main.ts`. Code reads correctly: `createScreen` uses an integer scale (`Math.floor`, min 1), sets `imageSmoothingEnabled = false`, and `index.html` has `image-rendering: pixelated`. Marc says he ran `npm run dev` by hand and it works; that is unverified by the reviewer.
  - Criterion 2, fixed-timestep update with separate render: **pass by code reading** (`src/game/loop.ts`: accumulator, `TIMESTEP` 1/60, `MAX_FRAME_TIME` clamp, `render(alpha)` separate). Actual running in a browser **can't verify**.
  - Criterion 3, keyboard module tracking held and just-pressed: **pass by code reading** (`src/input/keyboard.ts`: `isDown`, `wasPressed`, `endFrame`, repeat ignored, blur clears). Live behavior **can't verify**.
  - Criterion 4, `src/` layout (`main.ts`, `game/`, `input/`, `render/`, `assets/`): **pass.** All present; `assets/` holds `.gitkeep`.
  - Criterion 5, `.gitignore` and short `README.md` with run instructions: **pass.** `.gitignore` covers `node_modules/`, `dist/`, `reference-photos/*`; README has run steps.
  - `npm run build` (tsc --noEmit strict + vite build): **pass.** No test suite exists yet.
  - Privacy: only `reference-photos/README.md` is tracked; nothing else copied in. Pass.
  - **Out of scope (reason for the verdict):** commit fe6be7e also edits `PLAN.md` (worktree convention wording) and `.claude/skills/work-issue/SKILL.md`. `PLAN.md` says agents must not edit it, and neither file is in this issue's scope. Neither is on `main` (main is at ebe1d96).
  - Checklist for the author:
    - [x] Remove the `PLAN.md` and `.claude/skills/work-issue/SKILL.md` changes from this branch, or have Marc confirm they are intentional and should ride along.
    - [x] Optional: confirm the browser-only items (scaling, loop, key label) by hand and note it in the log.
  - No code defects found; once the scope item is resolved this should be approvable.
- 2026-10-22 Addressed review. Reverted `PLAN.md` and `.claude/skills/work-issue/SKILL.md` on this branch (they were planner edits and now live in their own commit e281028 on `main`). The branch diff against `main` should now touch only 001's files. Marc ran `npm run dev` by hand and confirmed it works (author-reported, not independently verified by the reviewer).
