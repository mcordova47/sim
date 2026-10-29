---
id: 111b
title: Side project config 2: compose the little room from the real one
status: review
owner: claude
depends_on: [111]
---

## Goal
Stage B: `composeSideProject` builds the list of pieces from the real main room and applies the config ops; faithful-copy test; ids slugged. No game change.

Design and Marc's answers (2026-10-29): `docs/side-project-config-design.md` (the little room is a faithful copy of the real room plus overrides from a config text file; drawn as a smoothed half-scale copy with a dim and light noise; `when` conditions come later in stage E; the tiny figure is a fixed glitch standing on the desk; no real effect at first, the picture only). Marc's idea (2026-10-29): the side project could have its own title, something like "Siminal Crossing" (text for the text review when picked). Main must be no worse than today after this stage (docs/deploy.md).

## Acceptance criteria
- The faithful copy test passes (no ops gives the real room's pieces); the checks above pass; an independent review.

## Progress log


- 2026-10-29: Started. Plan: a pure `composeSideProject` in `src/game/side-project-room.ts` with its own op types (from the design, not 111a's code), tests in `side-project-room.test.ts`. No game change.
- 2026-10-29: Built. Files: `src/game/side-project-room.ts`, `src/game/side-project-room.test.ts` (23 tests). Nothing else touched; nothing imports the new module yet, so the game is unchanged.
  - Ids: slug of the piece name, repeats numbered (`window-and-blinds`, `window-and-blinds-2`); props use their own slugged name (`snake-plant`, `coffee-mug`).
  - Faithful copy: floor, walls (with doorway sprites), pieces that have a sprite at their bounds, props (default sprite, honouring `when` through an optional state reader; default state all 0). Sorted by bottom edge with the real room's tie rule (state-changing pieces first). A test renders the real game (bed made) and checks every composed sprite is drawn there, in the same order, except the windows and the plant (their look follows state; the little room keeps the default look).
  - Choices: `move` carries what sits on a piece; `hide` hides it with its props; the figure is drawn last and follows moves; a later op on a hidden id is an error. Errors throw `ComposeError` naming the op; the caller (stage C) decides to warn and fall back. `look`/`add`/`figure` sprite names are checked only when `hasSprite` is passed.
  - Op types to line up with 111a's parser output: `{kind:"move",id,dx,dy}`, `{kind:"look",id,sprite}`, `{kind:"hide",id}`, `{kind:"add",id,sprite,x,y}`, `{kind:"figure",on,dx,dy,sprite?}`, `{kind:"dim",value}`. If 111a names differ, one mapping at the integration point.
  - Checked: `npx tsc --noEmit`, `npm run build`, `npm test` all pass.
  - Not checked: the figure sprite `side-project-figure` does not exist yet (stage D); nothing is drawn (stage C).
