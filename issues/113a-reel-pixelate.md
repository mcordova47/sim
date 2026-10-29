---
id: 113a
title: Photo reel 1: the pixelate function
status: todo
owner: claude
depends_on: [113]
---

## Goal
Stage A of section 10: pure `pixelate` in `src/game/reel/pixelate.ts` plus the palette accessor, per section 2 and the tests list in section 9.

Design and Marc's answers (2026-10-28): `docs/photo-reel-design.md` (sofa task; full 22 colours, Bayer dither strength 20, stored 48 x 36 or 36 x 48 shown at 3x; cap 60 pictures; a reset keeps the photos, REMOVE ALL is separate; one fixed caption line per session, never about resolution or size). Look tool: `art/tools/pixel-looks.html`. Privacy: no photo, name or caption of a photo ever enters the repo or bundle; `check:dist` unchanged.

## Acceptance criteria
- Pure function tests pass with synthetic images only; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

