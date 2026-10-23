---
id: 016
title: Draw the level and player with sprites
status: done
owner: agent
depends_on: [007, 008, 010, 011]
---

## Goal
Replace the coloured rectangles with the real art: furniture, decor and the player, drawn from the sprite pipeline.

## Acceptance criteria
- Every piece and decor entry in `room.ts` is drawn with its sprite (`sprites.draw`) at the right position, behind the player; missing sprites still show the labelled fallback rectangle.
- Decor draws behind the furniture and pieces in a sensible order (walls, decor, furniture, player, then UI).
- The player is drawn from the sprite frames from issue 008 (idle, walk, jump, fall, task), flipped in code for facing left, with the frame chosen from the player's state.
- Sprites are drawn through the camera from issue 010 and snapped to whole pixels.
- Sprites are loaded before the first frame (or the game shows the fallback until they arrive) without errors in the console.
- Interactable zones stop being drawn as translucent rectangles (or are behind a debug flag).
- The two example sprites from issue 006 (`couch`, a blue sofa that clashes with the real red and teal one, and `coffee-mug`) are removed from `art/src/` and `public/sprites/` once the real art is wired in, unless a test still uses them.
- Tests cover the draw order and the frame-selection logic without a browser.

## Progress log

- 2026-10-22: Starting. Plan: put the sprite list in the level (`scene`, built from `PIECES`/`DECOR` in `apartment.ts`), add a pure draw-order module and player frame selection in `src/render`, and have `Game` draw through a `SpriteDrawer` passed in from `main.ts`, which loads all sprites before starting the loop.
- 2026-10-22: Done, ready for review.
  - **Changed:** `Level` gets an optional `scene` (back wall, shell rects, props with layer `decor`/`furniture`); `buildScene()` in `apartment.ts` derives positions from the floor plan so there is one source of truth. `src/render/scene.ts` (`orderProps`, `drawScene`, `drawPlayer`), `src/render/player-sprite.ts` (`playerFrame`, `PlayerAnimator`), `Sprites.draw` gets a `flip` argument (mirrors inside the sprite cell) and a `SpriteDrawer` interface, `Game` takes an optional `SpriteDrawer`. `main.ts` loads every prop sprite and player frame, then starts the loop. Tuning (walk distance per frame, standing threshold, frame anchor) is in `PLAYER_ANIM` in `config.ts`; `DEBUG.zones` (default false) outlines task zones.
  - **Draw order:** back wall (slate), shell (dusk), decor, furniture (data order), player, then world UI, popups and HUD as before.
  - **Player:** frame by state: task (when busy) > jump (rising) / fall > idle (slow) > walk 1-4 by distance walked, so feet match speed. Drawn at hitbox - (3, 2), mirrored for facing left. The walk cycle restarts from frame 1 after a stop.
  - **Removed:** `couch` and `coffee-mug` sources and PNGs (nothing referenced them; `docs/art-style.md` still mentions them as naming examples, left alone).
  - **Without sprites** (tests, levels with no scene) `Game` falls back to the old plain rectangles, so existing tests are unchanged.
  - **Checked:** `npm run build` and `npm test` (109 total, including new `src/render/scene.test.ts`) pass; `npm run sprites` is idempotent. Tests cover draw order (real apartment data, recorded sprite calls), every sprite name existing in `public/sprites`, frame selection for every state, flipping, the animator, and no zone rectangles in a render.
  - **Not checked:** nothing was looked at in a browser, so the real look (sprite alignment against collision, wall colour, walk cycle feel and speed, flip) and console warnings are unverified. The back-wall and shell colours are my choice (slate, dusk), not from the art guide.
- 2026-10-22: Review (independent). Verdict: **approve**.
  - **Checks run:** `npm run build` and `npm test` (109 pass). Own throwaway test (not committed) against the real apartment data and files: every prop's PNG size in `public/sprites` equals its prop w/h from `room.ts` (0 mismatches, all 24 props present); resolved draw order is 7 decor then 17 furniture in data order; `Sprites.draw` flip math checked by reading it (translate(left + width, y), scale(-1, 1), draw at 0,0 covers the same cell, so position is unchanged). Player frame source has the 10x14 body at cols 3-12, rows 2-15, matching the (3, 2) anchor and symmetric for flipping.
  - Props drawn with their sprite, positions from the floor plan, behind player; fallback labelled rectangle kept (`Sprites.placeholder`, `onerror` resolves with a console warning): **pass**.
  - Order walls, decor, furniture, player, UI (`drawScene`, `drawWorld`): **pass**.
  - Player frames idle/walk/jump/fall/task by state, flipped in code: **pass** (code and tests).
  - Camera and whole-pixel snapping (`Math.round` in `draw`, drawn inside the camera transform): **pass** by reading; look unverified.
  - Loaded before first frame (`sprites.load(...).then(startLoop)`), errors resolve to placeholders: **pass** by reading; no browser run, so console output is **can't verify**.
  - Zones no longer drawn as translucent rects (outline only behind `DEBUG.zones`, default false): **pass**.
  - `couch` and `coffee-mug` removed from `art/src` and `public/sprites`; no remaining references in src/scripts/art/public: **pass**.
  - Tests for draw order and frame selection without a browser: **pass**.
  - **Unverified (no browser):** sprite alignment against collision, walk cycle speed and feel, flip appearance, wall (slate) and shell (dusk) colours, console warnings.
  - **Scope:** only expected files changed; PLAN.md and other issues untouched; no reference-photo or personal data. Minor notes, not blockers: `main.ts` uses `scene!` non-null assertion; `docs/art-style.md` still names couch/coffee-mug as examples (author left it deliberately).
