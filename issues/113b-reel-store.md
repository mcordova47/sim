---
id: 113b
title: Photo reel 2: the ReelStore
status: todo
owner: claude
depends_on: [113]
---

## Goal
Stage B: `ReelStore` interface with in-memory and IndexedDB versions, cap of 60, dedupe, tests; nothing wired into the game.

Design and Marc's answers (2026-10-28): `docs/photo-reel-design.md` (sofa task; full 22 colours, Bayer dither strength 20, stored 48 x 36 or 36 x 48 shown at 3x; cap 60 pictures; a reset keeps the photos, REMOVE ALL is separate; one fixed caption line per session, never about resolution or size). Look tool: `art/tools/pixel-looks.html`. Privacy: no photo, name or caption of a photo ever enters the repo or bundle; `check:dist` unchanged.

## Acceptance criteria
- Store tests pass; `npm test`, `npx tsc --noEmit`, `npm run build` pass; an independent review.

## Progress log

