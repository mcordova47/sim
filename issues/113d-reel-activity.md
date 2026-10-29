---
id: 113d
title: Photo reel 4: the reel and the sofa task
status: todo
owner: claude
depends_on: [113c]
---

## Goal
Stage D: `ReelActivity` and the conditional sofa task "Scroll through photos" with one fixed caption line per session; absent when there are no pictures.

Design and Marc's answers (2026-10-28): `docs/photo-reel-design.md` (sofa task; full 22 colours, Bayer dither strength 20, stored 48 x 36 or 36 x 48 shown at 3x; cap 60 pictures; a reset keeps the photos, REMOVE ALL is separate; one fixed caption line per session, never about resolution or size). Look tool: `art/tools/pixel-looks.html`. Privacy: no photo, name or caption of a photo ever enters the repo or bundle; `check:dist` unchanged.

## Acceptance criteria
- With pictures the task plays; with none the game is exactly as before (golden frames unchanged); `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

